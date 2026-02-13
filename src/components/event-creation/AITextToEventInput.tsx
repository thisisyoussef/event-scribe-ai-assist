import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ChevronDown, ChevronUp, Loader2, AlertCircle, Calendar, Clock, MapPin, Users, Wand2 } from "lucide-react";
import { parseEventFromText, hasOpenAIKey, type ParsedEventData } from "@/utils/openaiClient";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface AITextToEventInputProps {
  onEventParsed: (data: ParsedEventData) => void;
  disabled?: boolean;
}

const AITextToEventInput = ({ onEventParsed, disabled = false }: AITextToEventInputProps) => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<ParsedEventData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!text.trim()) return;

    setError(null);
    setPreview(null);
    setIsLoading(true);

    try {
      const result = await parseEventFromText(text.trim());
      setPreview(result);
    } catch (err: any) {
      setError(err.message || "Failed to parse event details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!preview) return;
    onEventParsed(preview);
    setPreview(null);
    setText("");
    setIsExpanded(false);
    toast({
      title: "Event details applied!",
      description: `Filled in ${preview.title ? 'event info' : 'details'}${preview.roles.length > 0 ? ` and ${preview.roles.length} volunteer roles` : ''}.`,
    });
  };

  const apiKeyConfigured = hasOpenAIKey();

  return (
    <Card className="border-white/10 bg-white/5 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
        disabled={disabled}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gold-400/10 flex items-center justify-center">
            <Wand2 className="w-4 h-4 text-gold-400" />
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold text-foreground">Generate from text</div>
            <div className="text-xs text-white/40">Paste event details and let AI fill the form</div>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-white/30" />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/30" />
        )}
      </button>

      {isExpanded && (
        <CardContent className="pt-0 pb-4 px-4 space-y-4">
          {!apiKeyConfigured ? (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm text-amber-300">
                  OpenAI API key required. Add your key in Settings to enable AI features.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/settings')}
                  className="border-amber-500/20 text-amber-300 hover:bg-amber-500/10 text-xs"
                >
                  Go to Settings
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setPreview(null);
                  setError(null);
                }}
                placeholder={"Paste or type your event details here...\n\nExample: \"Iftar dinner on March 15 from 6-9pm at the community center. Need 5 greeters, 3 food servers, 2 parking attendants\""}
                rows={4}
                className="text-sm resize-none border-white/10 focus-visible:ring-gold-400 rounded-xl"
                disabled={isLoading}
              />

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              {preview && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                  <div className="text-xs font-semibold text-white/40 uppercase tracking-wider">Preview</div>

                  {preview.title && (
                    <div className="text-base font-semibold text-foreground">{preview.title}</div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {preview.date && (
                      <Badge variant="secondary" className="bg-white/5 text-white/60 border-0 gap-1.5">
                        <Calendar className="w-3 h-3" />
                        {preview.date}
                      </Badge>
                    )}
                    {(preview.startTime || preview.endTime) && (
                      <Badge variant="secondary" className="bg-white/5 text-white/60 border-0 gap-1.5">
                        <Clock className="w-3 h-3" />
                        {preview.startTime || '?'} - {preview.endTime || '?'}
                      </Badge>
                    )}
                    {preview.location && (
                      <Badge variant="secondary" className="bg-white/5 text-white/60 border-0 gap-1.5">
                        <MapPin className="w-3 h-3" />
                        {preview.location}
                      </Badge>
                    )}
                  </div>

                  {preview.description && (
                    <p className="text-sm text-white/50">{preview.description}</p>
                  )}

                  {preview.roles.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-white/40 uppercase tracking-wider">
                        <Users className="w-3 h-3" />
                        {preview.roles.length} {preview.roles.length === 1 ? 'Role' : 'Roles'}
                      </div>
                      <div className="space-y-1.5">
                        {preview.roles.map((role, i) => (
                          <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                            <span className="text-sm font-medium text-foreground">{role.roleLabel}</span>
                            <span className="text-xs text-white/40">
                              {role.slotsBrother + role.slotsSister + role.slotsFlexible} needed
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleApply}
                    className="w-full h-11 bg-gold-400 hover:bg-gold-300 text-navy-800 font-semibold rounded-xl"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Apply to Event
                  </Button>
                </div>
              )}

              {!preview && (
                <Button
                  onClick={handleGenerate}
                  disabled={!text.trim() || isLoading}
                  className="w-full h-11 bg-gold-400 hover:bg-gold-300 text-navy-800 font-semibold rounded-xl disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Event
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default AITextToEventInput;
