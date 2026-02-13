export interface ParsedEventRole {
  roleLabel: string;
  slotsBrother: number;
  slotsSister: number;
  slotsFlexible: number;
  shiftStartTime?: string;
  shiftEndTime?: string;
  notes?: string;
}

export interface ParsedEventData {
  title?: string;
  description?: string;
  date?: string;       // YYYY-MM-DD
  startTime?: string;  // HH:MM (24h)
  endTime?: string;    // HH:MM (24h)
  location?: string;
  roles: ParsedEventRole[];
}

const SYSTEM_PROMPT = `You are an event planning assistant for a volunteer management system. Parse the following text into a structured event format.

Extract as much information as possible:
- Event title (a concise name for the event)
- Date (in YYYY-MM-DD format)
- Start time and end time (in HH:MM 24-hour format)
- Location
- Description (a brief summary of the event)
- Volunteer roles needed

For each volunteer role, extract:
- roleLabel: the name of the role (e.g., "Greeter", "Food Server", "Parking Attendant")
- slotsBrother: number of male volunteers needed (0 if not specified by gender)
- slotsSister: number of female volunteers needed (0 if not specified by gender)
- slotsFlexible: number of volunteers needed if gender is not specified (put the count here)
- shiftStartTime: when this role starts (HH:MM 24h format, defaults to event start time)
- shiftEndTime: when this role ends (HH:MM 24h format, defaults to event end time)
- notes: any special instructions for this role

If a number of volunteers is mentioned without specifying gender (e.g., "5 greeters"), put the count in slotsFlexible and set slotsBrother and slotsSister to 0.
If gender is specified (e.g., "3 brothers for parking"), use the appropriate field.

Return valid JSON matching this exact schema:
{
  "title": "string or null",
  "description": "string or null",
  "date": "YYYY-MM-DD or null",
  "startTime": "HH:MM or null",
  "endTime": "HH:MM or null",
  "location": "string or null",
  "roles": [
    {
      "roleLabel": "string",
      "slotsBrother": 0,
      "slotsSister": 0,
      "slotsFlexible": 0,
      "shiftStartTime": "HH:MM or null",
      "shiftEndTime": "HH:MM or null",
      "notes": "string or null"
    }
  ]
}

If a field cannot be determined from the text, set it to null. Always return at least an empty roles array.`;

function getOpenAIKey(): string | null {
  try {
    const raw = localStorage.getItem("settings");
    if (!raw) return null;
    const settings = JSON.parse(raw);
    return settings.openaiKey || null;
  } catch {
    return null;
  }
}

export function hasOpenAIKey(): boolean {
  return !!getOpenAIKey();
}

export async function parseEventFromText(text: string): Promise<ParsedEventData> {
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    throw new Error("No OpenAI API key configured. Go to Settings > Integrations to add your key.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || `OpenAI API error: ${response.status}`;
    throw new Error(message);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No response from OpenAI");
  }

  const parsed = JSON.parse(content);

  // Normalize the response
  return {
    title: parsed.title || undefined,
    description: parsed.description || undefined,
    date: parsed.date || undefined,
    startTime: parsed.startTime || undefined,
    endTime: parsed.endTime || undefined,
    location: parsed.location || undefined,
    roles: (parsed.roles || []).map((role: any) => ({
      roleLabel: role.roleLabel || "Untitled Role",
      slotsBrother: Math.max(0, parseInt(role.slotsBrother) || 0),
      slotsSister: Math.max(0, parseInt(role.slotsSister) || 0),
      slotsFlexible: Math.max(0, parseInt(role.slotsFlexible) || 0),
      shiftStartTime: role.shiftStartTime || undefined,
      shiftEndTime: role.shiftEndTime || undefined,
      notes: role.notes || undefined,
    })),
  };
}
