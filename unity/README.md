# NPC Studio — Unity Integration

Two C# scripts are all you need to give **any** Unity character a Gemini-powered brain.

```
unity/Scripts/
├── NpcBrain.cs               ← the one "drop-in" component
└── NpcInteractionTrigger.cs  ← optional: proximity + keypress to talk
```

---

## Quick-start (5 minutes)

### 1. Copy the scripts

Copy both `.cs` files into your Unity project's `Assets/` folder (any subfolder is fine).

---

### 2. Create an NPC in NPC Studio

1. Open the NPC Studio website.
2. Click **New Character** and fill in Name, Role, Persona, Rules, and Capabilities.
3. Save the NPC.
4. Open the NPC's edit page and expand **🎮 Unity Integration**.
5. **Copy the NPC ID** (yellow code block) — you'll paste this into Unity.
6. **Copy the Chat Endpoint URL** (blue code block) — this is your `serverUrl`.

---

### 3. Add NpcBrain to your character

1. Select your character GameObject in the Unity Hierarchy.
2. In the Inspector, click **Add Component → NPC Brain → NPC Brain**.
3. Fill in the two required fields:

| Field | Value |
|-------|-------|
| **Server Url** | The URL you copied from the Unity Integration panel (e.g. `http://localhost:3000` or `https://your-site.vercel.app`) |
| **Npc Id** | The NPC ID you copied from the Unity Integration panel |

That's it. The component auto-detects `Animator` and `NavMeshAgent` on the same GameObject.

---

### 4. (Optional) Add player interaction

1. Add **NPC Interaction Trigger** to the same GameObject.
2. Set **Interaction Radius** (default 3 m) — a blue sphere gizmo appears in the Scene view.
3. Make sure your Player GameObject has the **"Player"** tag.
4. Press **Play** → walk up to the character → press **E**.

---

## Inspector fields reference

### NpcBrain

| Field | Description |
|-------|-------------|
| `serverUrl` | Your NPC Studio base URL |
| `npcId` | NPC ID from the Unity Integration panel |
| `dialoguePanel` | (optional) A UI GameObject to show/hide when the NPC speaks |
| `dialogueLabel` | (optional) A `UI.Text` or `TMP_Text` to display dialogue |
| `autoHideSeconds` | Seconds until dialogue auto-hides (0 = never) |
| `animator` | Auto-found if left empty |
| `speedParam` | Animator float for walk/idle blend (default: `"speed"`) |
| `moodParam` | Animator int for mood (default: `"mood"`) |
| `navMeshAgent` | Auto-found if left empty |
| `defaultWanderRadius` | Wander radius when the brain doesn't specify one |
| `defaultWanderSeconds` | Wander duration when the brain doesn't specify one |
| `onDialogue` | UnityEvent fired with dialogue text |
| `onIntent` | UnityEvent fired with intent string |
| `onResponseComplete` | UnityEvent fired with true/false on completion |

### NpcInteractionTrigger

| Field | Description |
|-------|-------------|
| `interactionRadius` | Detection radius (metres) |
| `interactKey` | Key that triggers the conversation (default: `E`) |
| `defaultGreeting` | Message sent to the brain when player presses the key |
| `promptPanel` | (optional) UI panel for the "Press E to talk" prompt |
| `promptLabel` | (optional) `UI.Text` or `TMP_Text` for the prompt |
| `promptText` | Template text — `{key}` is replaced with the key name |

---

## Animator setup (optional but recommended)

If your character has an Animator, add these parameters to your Animator Controller:

| Name | Type | Description |
|------|------|-------------|
| `speed` | Float | `0` = idle, `1` = walking — driven by NavMeshAgent velocity |
| `mood` | Integer | `0`=neutral `1`=happy `2`=angry `3`=sad `4`=focused |
| `nod` | Trigger | Gesture |
| `wave` | Trigger | Gesture |
| `point` | Trigger | Gesture |
| `shrug` | Trigger | Gesture |
| `angry` | Trigger | Gesture |

Only add the parameters for gestures you've enabled in NPC Studio. The script silently ignores unknown triggers.

**Recommended free animations:** [Mixamo](https://mixamo.com) — search "idle", "walk", "nod", "wave" etc.

---

## NavMesh setup (required for walking)

1. In the Unity menu, go to **Window → AI → Navigation**.
2. Select the floor/ground objects in your scene, mark them as **Navigation Static**.
3. In the Navigation window, click **Bake**.
4. The NPC will now walk when the brain returns `"move": { "mode": "wander" }`.

---

## Calling the brain from code

```csharp
// From any other script:
var brain = npcGameObject.GetComponent<NpcBrain>();
brain.Ask("Can you help me find the blacksmith?");

// Listen to responses:
brain.onDialogue.AddListener(text => Debug.Log("NPC said: " + text));
brain.onIntent.AddListener(intent => {
    if (intent == "give_quest") StartQuestUI();
});
```

---

## Enabling walking (tell NPC Studio to wander)

The brain returns `"move": { "mode": "wander" }` when the NPC should walk around.
To trigger this, make sure:

1. The NPC's **Capabilities → Allowed Actions** includes something other than just `none`.
2. Your NPC's **persona/goals** mention exploration or patrolling.
3. The Gemini model will naturally decide to wander when context calls for it.

You can also force it to always wander by modifying the system prompt in `src/app/api/npc/chat/route.ts`.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `npcId is empty` error | Paste the NPC ID from the Unity Integration panel |
| `NPC not found (404)` | Make sure the NPC Studio server is running and the ID is correct |
| No movement | Check NavMesh is baked; NavMeshAgent is on the same GameObject |
| No animation | Verify Animator parameter names match the fields in the Inspector |
| CORS error (WebGL only) | The server already adds `Access-Control-Allow-Origin: *` headers |
| Gemini returns stub | API quota is exhausted; the stub response still drives animations/movement |
