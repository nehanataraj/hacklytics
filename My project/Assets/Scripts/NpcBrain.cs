// NpcBrain.cs — Drop-in NPC AI component for NPC Studio
// ─────────────────────────────────────────────────────
// 1. Attach this to any character GameObject.
// 2. Paste the NPC ID from NPC Studio into the npcId field.
// 3. Set serverUrl to your NPC Studio URL (e.g. https://your-site.vercel.app).
// 4. Optionally wire up a dialogue Text/TMP_Text, an Animator, and a NavMeshAgent.
//    All of these are auto-found on the same GameObject if left empty.
//
// To trigger a conversation from code:  GetComponent<NpcBrain>().Ask("Hello!");

using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.AI;
using UnityEngine.Networking;
using UnityEngine.Events;

#if UNITY_TMPRO || TEXTMESHPRO_ENABLED
using TMPro;
#endif

[AddComponentMenu("NPC Brain/NPC Brain")]
[DisallowMultipleComponent]
public class NpcBrain : MonoBehaviour
{
    // ── NPC Studio Connection ─────────────────────────────────────────────
    [Header("NPC Studio Connection")]
    [Tooltip("Base URL of your NPC Studio server, e.g. http://localhost:3000 or https://yoursite.vercel.app")]
    public string serverUrl = "http://localhost:3000";

    [Tooltip("NPC ID — copy from NPC Studio > Edit NPC > Unity Integration panel")]
    public string npcId;

    // ── Dialogue UI ───────────────────────────────────────────────────────
    [Header("Dialogue UI (optional)")]
    [Tooltip("A panel/canvas GameObject to show/hide when NPC speaks")]
    public GameObject dialoguePanel;

    [Tooltip("A UI Text component to display dialogue. Works with both Text and TMP_Text.")]
    public Component dialogueLabel;   // Assign a UI.Text or TMP_Text in the Inspector

    [Tooltip("Seconds before dialogue auto-hides (0 = stay visible forever)")]
    public float autoHideSeconds = 5f;

    // ── Animator ─────────────────────────────────────────────────────────
    [Header("Animator (optional — auto-found on this GameObject if empty)")]
    public Animator animator;

    [Tooltip("Float parameter name that drives idle/walk blend (0 = idle, 1 = walk)")]
    public string speedParam = "speed";

    [Tooltip("Integer parameter name that controls the NPC's mood (0=neutral,1=happy,2=angry,3=sad,4=focused)")]
    public string moodParam = "mood";

    // ── NavMesh Movement ──────────────────────────────────────────────────
    [Header("Movement (optional — auto-found on this GameObject if empty)")]
    public NavMeshAgent navMeshAgent;

    [Tooltip("Wander radius to use when the brain response doesn't specify one")]
    public float defaultWanderRadius = 5f;

    [Tooltip("Wander duration to use when the brain response doesn't specify one")]
    public float defaultWanderSeconds = 8f;

    // ── Events ────────────────────────────────────────────────────────────
    [Header("Events (optional)")]
    [Tooltip("Fired with the NPC's dialogue string every time it speaks")]
    public UnityEvent<string> onDialogue;

    [Tooltip("Fired with the intent string (answer / ask_question / give_quest / refuse)")]
    public UnityEvent<string> onIntent;

    [Tooltip("Fired when the HTTP request completes (true = success, false = error)")]
    public UnityEvent<bool> onResponseComplete;

    // ── Read-only state ───────────────────────────────────────────────────
    public bool IsBusy => _isBusy;

    // ── Internals ─────────────────────────────────────────────────────────
    private bool       _isBusy;
    private Coroutine  _wanderCoroutine;
    private Coroutine  _hideDialogueCoroutine;

    // ─────────────────────────────────────────────────────────────────────
    void Awake()
    {
        if (animator     == null) animator     = GetComponent<Animator>();
        if (navMeshAgent == null) navMeshAgent = GetComponent<NavMeshAgent>();
    }

    void Update()
    {
        // Drive walk/idle blend tree from the NavMeshAgent's actual speed.
        if (animator != null && navMeshAgent != null && navMeshAgent.isActiveAndEnabled)
        {
            float normalised = navMeshAgent.speed > 0
                ? navMeshAgent.velocity.magnitude / navMeshAgent.speed
                : 0f;
            animator.SetFloat(speedParam, normalised, 0.1f, Time.deltaTime);
        }
    }

    // ── Public API ────────────────────────────────────────────────────────

    /// <summary>Send player text to the NPC brain and apply the response.</summary>
    public void Ask(string playerText)
    {
        if (string.IsNullOrWhiteSpace(npcId))
        {
            Debug.LogError("[NpcBrain] npcId is empty. Copy the NPC ID from NPC Studio.");
            return;
        }
        if (_isBusy) return;
        StartCoroutine(CallBrain(playerText));
    }

    // ── HTTP Request ──────────────────────────────────────────────────────
    IEnumerator CallBrain(string playerText)
    {
        _isBusy = true;

        // Build request JSON
        var worldPayload = new BrainRequestWorld
        {
            npcPos = new NpcVec3(transform.position)
        };
        var payload = new BrainRequest
        {
            npcId      = this.npcId,
            playerText = playerText,
            world      = worldPayload
        };
        string json    = JsonUtility.ToJson(payload);
        byte[] bodyRaw = Encoding.UTF8.GetBytes(json);

        string url = serverUrl.TrimEnd('/') + "/api/npc/chat";
        using var req = new UnityWebRequest(url, "POST");
        req.uploadHandler   = new UploadHandlerRaw(bodyRaw);
        req.downloadHandler = new DownloadHandlerBuffer();
        req.SetRequestHeader("Content-Type", "application/json");

        yield return req.SendWebRequest();

        _isBusy = false;

        if (req.result != UnityWebRequest.Result.Success)
        {
            Debug.LogWarning($"[NpcBrain] Request failed ({req.responseCode}): {req.error}");
            onResponseComplete?.Invoke(false);
            yield break;
        }

        BrainResponse response;
        try
        {
            response = JsonUtility.FromJson<BrainResponse>(req.downloadHandler.text);
        }
        catch (Exception e)
        {
            Debug.LogWarning($"[NpcBrain] JSON parse error: {e.Message}\nRaw: {req.downloadHandler.text}");
            onResponseComplete?.Invoke(false);
            yield break;
        }

        ApplyResponse(response);
        onResponseComplete?.Invoke(true);
    }

    // ── Apply Response ────────────────────────────────────────────────────
    void ApplyResponse(BrainResponse r)
    {
        if (!string.IsNullOrEmpty(r.dialogue))
        {
            ShowDialogue(r.dialogue);
            onDialogue?.Invoke(r.dialogue);
        }

        PlayGesture(r.gesture);
        SetMood(r.mood);
        ApplyMove(r.move);

        if (!string.IsNullOrEmpty(r.intent))
            onIntent?.Invoke(r.intent);

        Debug.Log($"[NpcBrain] {gameObject.name} → dialogue='{r.dialogue}' mood={r.mood} gesture={r.gesture} intent={r.intent}");
    }

    // ── Dialogue ──────────────────────────────────────────────────────────
    void ShowDialogue(string text)
    {
        if (dialoguePanel != null) dialoguePanel.SetActive(true);

        if (dialogueLabel != null)
        {
#if UNITY_TMPRO || TEXTMESHPRO_ENABLED
            if (dialogueLabel is TMP_Text tmp)  { tmp.text  = text; goto done; }
#endif
            if (dialogueLabel is UnityEngine.UI.Text uiText) { uiText.text = text; }
        }
#if UNITY_TMPRO || TEXTMESHPRO_ENABLED
        done:;
#endif
        if (_hideDialogueCoroutine != null) StopCoroutine(_hideDialogueCoroutine);
        if (autoHideSeconds > 0)
            _hideDialogueCoroutine = StartCoroutine(HideDialogueAfter(autoHideSeconds));
    }

    IEnumerator HideDialogueAfter(float seconds)
    {
        yield return new WaitForSeconds(seconds);
        if (dialoguePanel != null) dialoguePanel.SetActive(false);
        if (dialogueLabel != null)
        {
#if UNITY_TMPRO || TEXTMESHPRO_ENABLED
            if (dialogueLabel is TMP_Text tmp)  { tmp.text  = ""; goto done; }
#endif
            if (dialogueLabel is UnityEngine.UI.Text uiText) { uiText.text = ""; }
        }
#if UNITY_TMPRO || TEXTMESHPRO_ENABLED
        done:;
#endif
    }

    // ── Animation ─────────────────────────────────────────────────────────
    void PlayGesture(string gesture)
    {
        if (animator == null || string.IsNullOrEmpty(gesture) || gesture == "none") return;
        try   { animator.SetTrigger(gesture); }
        catch { Debug.LogWarning($"[NpcBrain] Animator has no trigger '{gesture}'. Add it or check your Animator Controller."); }
    }

    void SetMood(string mood)
    {
        if (animator == null) return;
        int val;
        switch (mood)
        {
            case "happy":   val = 1; break;
            case "angry":   val = 2; break;
            case "sad":     val = 3; break;
            case "focused": val = 4; break;
            default:        val = 0; break;
        }
        try { animator.SetInteger(moodParam, val); }
        catch { /* parameter doesn't exist — silently ignore */ }
    }

    // ── Movement ──────────────────────────────────────────────────────────
    void ApplyMove(BrainMove move)
    {
        if (navMeshAgent == null || move == null) return;

        if (move.mode == "wander")
        {
            float radius  = move.radius  > 0 ? move.radius  : defaultWanderRadius;
            float seconds = move.seconds > 0 ? move.seconds : defaultWanderSeconds;

            if (_wanderCoroutine != null) StopCoroutine(_wanderCoroutine);
            _wanderCoroutine = StartCoroutine(WanderRoutine(radius, seconds));
        }
        else
        {
            StopWander();
        }
    }

    void StopWander()
    {
        if (_wanderCoroutine != null) { StopCoroutine(_wanderCoroutine); _wanderCoroutine = null; }
        if (navMeshAgent != null && navMeshAgent.isActiveAndEnabled) navMeshAgent.ResetPath();
    }

    IEnumerator WanderRoutine(float radius, float totalSeconds)
    {
        float elapsed = 0f;
        while (elapsed < totalSeconds)
        {
            if (TryRandomNavPoint(transform.position, radius, out Vector3 dest))
                navMeshAgent.SetDestination(dest);

            // Wait until the agent arrives (or give up after 8 s).
            float waitLimit = 8f;
            while (waitLimit > 0 && (navMeshAgent.pathPending || navMeshAgent.remainingDistance > navMeshAgent.stoppingDistance + 0.1f))
            {
                yield return new WaitForSeconds(0.25f);
                waitLimit -= 0.25f;
            }

            float pause = UnityEngine.Random.Range(0.5f, 2f);
            yield return new WaitForSeconds(pause);
            elapsed += pause + 1f;
        }
        if (navMeshAgent != null && navMeshAgent.isActiveAndEnabled) navMeshAgent.ResetPath();
        _wanderCoroutine = null;
    }

    bool TryRandomNavPoint(Vector3 origin, float radius, out Vector3 result)
    {
        for (int i = 0; i < 10; i++)
        {
            Vector3 candidate = origin + UnityEngine.Random.insideUnitSphere * radius;
            candidate.y = origin.y;
            if (NavMesh.SamplePosition(candidate, out NavMeshHit hit, 2f, NavMesh.AllAreas))
            {
                result = hit.position;
                return true;
            }
        }
        result = origin;
        return false;
    }
}

// ── Data types (defined here to keep the package self-contained) ────────────

[Serializable]
public class NpcVec3
{
    public float x, y, z;
    public NpcVec3() {}
    public NpcVec3(Vector3 v) { x = v.x; y = v.y; z = v.z; }
}

[Serializable]
public class BrainRequestWorld
{
    public NpcVec3 playerPos;
    public NpcVec3 npcPos;
}

[Serializable]
public class BrainRequest
{
    public string           npcId;
    public string           playerText;
    public BrainRequestWorld world;
}

[Serializable]
public class BrainMove
{
    public string mode;    // "none" | "wander"
    public float  radius;
    public float  seconds;
}

[Serializable]
public class BrainResponse
{
    public string    dialogue;
    public string    mood;      // neutral | happy | angry | sad | focused
    public string    gesture;   // none | nod | wave | point | shrug | angry
    public string    intent;    // answer | ask_question | give_quest | refuse
    public BrainMove move;
}
