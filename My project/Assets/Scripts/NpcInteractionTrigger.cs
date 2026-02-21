// NpcInteractionTrigger.cs — Proximity + keypress interaction with an NpcBrain
// ─────────────────────────────────────────────────────────────────────────────
// Add this component to the same GameObject as NpcBrain (or a child).
// When a player walks within `interactionRadius`, a prompt appears.
// Pressing the interact key calls brain.Ask() with a greeting message.
//
// Requirements:
//   • Your Player GameObject must be tagged "Player".
//   • NpcBrain must be on the same GameObject (or assign it manually).

using UnityEngine;
using UnityEngine.Events;

#if UNITY_TMPRO || TEXTMESHPRO_ENABLED
using TMPro;
#endif

[AddComponentMenu("NPC Brain/NPC Interaction Trigger")]
public class NpcInteractionTrigger : MonoBehaviour
{
    // ── Settings ──────────────────────────────────────────────────────────
    [Header("Interaction")]
    [Tooltip("How close the player needs to be to trigger the prompt")]
    public float interactionRadius = 3f;

    [Tooltip("Key the player presses to start talking")]
    public KeyCode interactKey = KeyCode.E;

    [Tooltip("First message the player sends (can be overridden via SendMessage)")]
    public string defaultGreeting = "Hello!";

    // ── Prompt UI (optional) ──────────────────────────────────────────────
    [Header("Prompt UI (optional)")]
    [Tooltip("A UI panel to show/hide the 'Press E to talk' prompt")]
    public GameObject promptPanel;

    [Tooltip("A Text or TMP_Text component to display the prompt message")]
    public Component promptLabel;

    [Tooltip("Text shown in the prompt (use {key} for the key name)")]
    public string promptText = "[{key}] Talk";

    // ── Events ────────────────────────────────────────────────────────────
    [Header("Events")]
    public UnityEvent onPlayerEnter;
    public UnityEvent onPlayerExit;
    public UnityEvent onInteract;

    // ── Internals ─────────────────────────────────────────────────────────
    private NpcBrain _brain;
    private bool     _playerInRange;
    private Transform _player;

    void Awake()
    {
        _brain = GetComponent<NpcBrain>();
        if (_brain == null)
            Debug.LogError("[NpcInteractionTrigger] NpcBrain component not found on this GameObject.");

        if (promptPanel != null) promptPanel.SetActive(false);
    }

    void Update()
    {
        DetectPlayer();

        if (_playerInRange && Input.GetKeyDown(interactKey))
            Interact();
    }

    // ── Proximity detection ───────────────────────────────────────────────
    void DetectPlayer()
    {
        // Lazy-find the player once
        if (_player == null)
        {
            var playerObj = GameObject.FindGameObjectWithTag("Player");
            if (playerObj != null) _player = playerObj.transform;
        }
        if (_player == null) return;

        bool inRange = Vector3.Distance(transform.position, _player.position) <= interactionRadius;

        if (inRange && !_playerInRange)
        {
            _playerInRange = true;
            ShowPrompt(true);
            onPlayerEnter?.Invoke();
        }
        else if (!inRange && _playerInRange)
        {
            _playerInRange = false;
            ShowPrompt(false);
            onPlayerExit?.Invoke();
        }
    }

    // ── Interaction ───────────────────────────────────────────────────────

    /// <summary>Trigger the interaction manually (e.g., from a button OnClick).</summary>
    public void Interact() => Interact(defaultGreeting);

    /// <summary>Trigger with a custom message.</summary>
    public void Interact(string playerText)
    {
        if (_brain == null || _brain.IsBusy) return;
        onInteract?.Invoke();
        _brain.Ask(playerText);
    }

    // ── Prompt UI ─────────────────────────────────────────────────────────
    void ShowPrompt(bool show)
    {
        if (promptPanel != null) promptPanel.SetActive(show);

        if (show && promptLabel != null)
        {
            string text = promptText.Replace("{key}", interactKey.ToString());
#if UNITY_TMPRO || TEXTMESHPRO_ENABLED
            if (promptLabel is TMP_Text tmp)  { tmp.text  = text; goto done; }
#endif
            if (promptLabel is UnityEngine.UI.Text uiText) { uiText.text = text; }
#if UNITY_TMPRO || TEXTMESHPRO_ENABLED
            done:;
#endif
        }
    }

    // ── Gizmos — visualise interaction radius in the Scene view ───────────
    void OnDrawGizmosSelected()
    {
        Gizmos.color = new Color(0.2f, 0.8f, 1f, 0.3f);
        Gizmos.DrawSphere(transform.position, interactionRadius);
        Gizmos.color = new Color(0.2f, 0.8f, 1f, 0.8f);
        Gizmos.DrawWireSphere(transform.position, interactionRadius);
    }
}
