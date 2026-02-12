
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, AlertCircle, Eye, EyeOff, Lock, Mail, User, Phone, Shield, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"brother" | "sister" | "">("");
  const [pocCode, setPocCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form validation states
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    phone?: string;
    gender?: string;
    email?: string;
    password?: string;
    pocCode?: string;
  }>({});
  const [touched, setTouched] = useState<{
    firstName?: boolean;
    lastName?: boolean;
    phone?: boolean;
    gender?: boolean;
    email?: boolean;
    password?: boolean;
    pocCode?: boolean;
  }>({});
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const appBaseUrl = (import.meta as { env?: { VITE_SITE_URL?: string } }).env?.VITE_SITE_URL || window.location.origin;

  // Normalize a phone number to E.164 (+15551234567)
  // - Removes spaces, dashes, parentheses
  // - Adds +1 for 10-digit US numbers
  const normalizePhoneE164 = (input: string) => {
    const digits = (input || "").replace(/[^\d+]/g, "");
    if (digits.startsWith('+')) return digits;
    if (/^1\d{10}$/.test(digits)) return `+${digits}`;
    if (/^\d{10}$/.test(digits)) return `+1${digits}`;
    return digits ? `+${digits}` : "";
  };

  // Validation function
  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'firstName':
        if (!value.trim()) return 'First name is required';
        if (value.trim().length < 2) return 'First name must be at least 2 characters';
        return '';
      case 'lastName':
        if (!value.trim()) return 'Last name is required';
        if (value.trim().length < 2) return 'Last name must be at least 2 characters';
        return '';
      case 'phone':
        if (!value.trim()) return 'Phone number is required';
        if (!/^\+?[\d\s\-()]+$/.test(value)) return 'Please enter a valid phone number';
        return '';
      case 'gender':
        if (!value) return 'Please select brother or sister';
        return '';
      case 'email':
        if (!value.trim()) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address';
        return '';
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 6) return 'Password must be at least 6 characters';
        return '';
      case 'pocCode':
        if (!value.trim()) return 'POC verification code is required';
        return '';
      default:
        return '';
    }
  };

  // Handle field blur for validation
  const handleBlur = (name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    // Only validate if there's already an error (user has tried to submit)
    if (errors[name as keyof typeof errors]) {
      const value = name === 'firstName' ? firstName : 
                    name === 'lastName' ? lastName : 
                    name === 'phone' ? phone : 
                    name === 'gender' ? gender : 
                    name === 'email' ? email : 
                    name === 'password' ? password : 
                    name === 'pocCode' ? pocCode : '';
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  // Handle field change with validation
  const handleFieldChange = (name: string, value: string) => {
    // Update the field value
    switch (name) {
      case 'firstName':
        setFirstName(value);
        break;
      case 'lastName':
        setLastName(value);
        break;
      case 'phone':
        setPhone(value);
        break;
      case 'email':
        setEmail(value);
        break;
      case 'password':
        setPassword(value);
        break;
      case 'pocCode':
        setPocCode(value);
        break;
      case 'gender':
        setGender(value as "brother" | "sister");
        break;
    }

    // Clear error when user starts typing (only if there was an error)
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validate all fields
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    
    if (isSignUp) {
      newErrors.firstName = validateField('firstName', firstName);
      newErrors.lastName = validateField('lastName', lastName);
      newErrors.phone = validateField('phone', phone);
      newErrors.gender = validateField('gender', gender);
      newErrors.email = validateField('email', email);
      newErrors.password = validateField('password', password);
      newErrors.pocCode = validateField('pocCode', pocCode);
    } else if (isForgotPassword) {
      newErrors.email = validateField('email', email);
    } else {
      newErrors.email = validateField('email', email);
      newErrors.password = validateField('password', password);
    }

    setErrors(newErrors);
    
    // Mark all fields as touched only after validation attempt
    const allFields = isSignUp ? ['firstName', 'lastName', 'phone', 'gender', 'email', 'password', 'pocCode'] :
                     isForgotPassword ? ['email'] : ['email', 'password'];
    setTouched(allFields.reduce((acc, field) => ({ ...acc, [field]: true }), {}));
    
    return !Object.values(newErrors).some(error => error);
  };

  useEffect(() => {
    // Check for mode parameter to determine initial state
    const mode = searchParams.get('mode');
    if (mode === 'signup') {
      setIsSignUp(true);
    }

    // Show friendly notices from auth callback
    const notice = searchParams.get('notice');
    if (notice === 'link_expired') {
      toast({
        title: "Sign-in link expired",
        description: "That link was already used or has expired. Please sign in again.",
      });
    } else if (notice === 'invalid_callback') {
      toast({
        title: "Sign-in incomplete",
        description: "We couldn't complete sign-in. Please try again.",
        variant: "destructive",
      });
    }

    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        navigate("/dashboard");
      }
    };
    
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, session);
        
        if (event === 'SIGNED_IN' && session) {
          navigate("/dashboard");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate, toast, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form before submission
    if (!validateForm()) {
      // Count the number of errors
      const errorCount = Object.values(errors).filter(error => error).length;
      const errorFields = Object.keys(errors).filter(key => errors[key as keyof typeof errors]);
      
      // Convert technical field names to user-friendly names
      const fieldNameMap: { [key: string]: string } = {
        firstName: 'First Name',
        lastName: 'Last Name',
        phone: 'Phone Number',
        gender: 'Gender',
        email: 'Email',
        password: 'Password',
        pocCode: 'POC Verification Code'
      };
      
      const userFriendlyFieldNames = errorFields.map(field => fieldNameMap[field] || field);
      
      toast({
        title: "Form Needs Attention",
        description: `Please fill in ${errorCount} field${errorCount > 1 ? 's' : ''}: ${userFriendlyFieldNames.join(', ')}`,
        variant: "destructive",
      });
      
      // Scroll to the first error field
      const firstErrorField = document.getElementById(errorFields[0]);
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstErrorField.focus();
      }
      
      return;
    }
    
    setLoading(true);
    
    try {
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${appBaseUrl}/reset-password?redirect=/dashboard`,
        });

        if (error) {
          console.error('Password reset error:', error);
          toast({
            title: "Password Reset Error",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Check your email",
            description: "We've sent you a password reset link. Please check your email and follow the instructions to reset your password.",
          });
          setIsForgotPassword(false); // Switch back to login view
        }
      } else if (isSignUp) {
        // Validate POC code
        if (pocCode !== "admin123") {
          setErrors(prev => ({ ...prev, pocCode: 'Invalid POC verification code' }));
          setTouched(prev => ({ ...prev, pocCode: true }));
          toast({
            title: "Invalid POC Code",
            description: "Please enter the correct POC verification code to create an account.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const normalizedPhone = normalizePhoneE164(phone);

        // Before sign-up, ensure a contact with this phone does not get duplicated.
        // If a contact already exists with this phone, skip creating a new contact later.
        const { data: existingByPhone } = await supabase
          .from('contacts')
          .select('id')
          .eq('phone', normalizedPhone)
          .maybeSingle();

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: `${firstName} ${lastName}`,
              phone: normalizedPhone,
              gender: gender,
            },
            emailRedirectTo: `${appBaseUrl}/auth/callback`
          }
        });

        if (error) {
          console.error('Signup error:', error);
          toast({
            title: "Sign Up Error",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Check your email",
            description: "We've sent you a confirmation link. Please check your email and click the link to verify your account.",
          });
          setIsSignUp(false); // Switch back to login view
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error('Signin error:', error);
          toast({
            title: "Sign In Error",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Welcome Back",
            description: "You've successfully signed in.",
          });
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setFirstName("");
    setLastName("");
    setPhone("");
    setGender("");
    setPocCode("");
    setErrors({});
    setTouched({});
    setIsSignUp(false);
    setIsForgotPassword(false);
  };

  // Helper function to render input with error state
  const renderInput = (
    name: string,
    label: string,
    type: string,
    placeholder: string,
    value: string,
    onChange: (value: string) => void,
    required: boolean = true,
    icon?: React.ReactNode,
    rightElement?: React.ReactNode
  ) => {
    const hasError = touched[name as keyof typeof touched] && errors[name as keyof typeof errors];
    
    return (
      <div className="space-y-2">
        <Label htmlFor={name} className="text-sm font-medium text-white/80">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
        {name === 'password' && rightElement ? (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              {icon && (
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40">
                  {icon}
                </div>
              )}
              <Input
                id={name}
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onBlur={() => handleBlur(name)}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                name="password"
                required={false}
                className={`h-11 transition-all duration-200 placeholder:text-white/30 ${
                  icon ? 'pl-10' : ''
                } ${
                  hasError 
                    ? 'border-red-500/50 focus:border-red-400 focus:ring-red-400/20 bg-red-500/10 text-foreground' 
                    : 'border-white/15 focus:border-gold-400 focus:ring-gold-400/20 bg-white/5 text-foreground'
                }`}
              />
            </div>
            <div className="shrink-0">
              {rightElement}
            </div>
          </div>
        ) : (
          <div className="relative">
            {icon && (
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40">
                {icon}
              </div>
            )}
            <Input
              id={name}
              type={type}
              placeholder={placeholder}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onBlur={() => handleBlur(name)}
              autoComplete={
                name === 'pocCode' ? 'off' : name === 'email' ? 'email' : undefined
              }
              autoCorrect={name === 'pocCode' ? 'off' : undefined}
              autoCapitalize={name === 'pocCode' ? 'none' : undefined}
              spellCheck={name === 'pocCode' ? false : undefined}
              inputMode={name === 'pocCode' ? 'text' : undefined}
              name={name === 'pocCode' ? 'poc_code' : name}
              data-lpignore={name === 'pocCode' ? 'true' : undefined}
              data-1p-ignore={name === 'pocCode' ? 'true' : undefined}
              data-form-type={name === 'pocCode' ? 'other' : undefined}
              aria-autocomplete={name === 'pocCode' ? 'none' : undefined}
              required={false}
              className={`h-11 transition-all duration-200 placeholder:text-white/30 ${
                icon ? 'pl-10' : ''
              } ${
                hasError 
                  ? 'border-red-500/50 focus:border-red-400 focus:ring-red-400/20 bg-red-500/10 text-foreground' 
                  : 'border-white/15 focus:border-gold-400 focus:ring-gold-400/20 bg-white/5 text-foreground'
              }`}
            />
            {rightElement && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {rightElement}
              </div>
            )}
          </div>
        )}
        {hasError && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors[name as keyof typeof errors]}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      {/* Top Bar */}
      <div className="border-b border-gold-400/10 bg-navy-800/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate("/")}
                className="flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer"
              >
                <div className="crescent-moon mr-1" />
                <span className="text-lg font-semibold text-gold-300 tracking-wide">UMMA Stewards</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl shadow-black/30 golden-glow">
          <CardHeader className="space-y-2 text-center pb-6">
            {isForgotPassword && (
              <button
                onClick={() => setIsForgotPassword(false)}
                className="absolute left-4 top-4 p-2 text-white/40 hover:text-gold-300 hover:bg-white/5 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <CardTitle className="text-2xl font-semibold text-foreground">
              {isForgotPassword ? "Reset Password" : isSignUp ? "Create POC Account" : "Welcome back"}
            </CardTitle>
            <CardDescription className="text-white/60 text-base">
              {isForgotPassword
                ? "Enter your email to receive a password reset link"
                : isSignUp
                  ? "Sign up as a Point of Contact to organize events"
                  : "Sign in to access your dashboard"
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {isForgotPassword ? (
                <div className="space-y-4">
                  {renderInput('email', 'Email', 'email', 'hello@example.com', email, (value) => handleFieldChange('email', value), true, <Mail className="w-4 h-4" />)}
                </div>
              ) : (
                <>
                  {isSignUp && (
                    <div className="space-y-4">
                      {renderInput('firstName', 'First Name', 'text', 'Your first name', firstName, (value) => handleFieldChange('firstName', value), true, <User className="w-4 h-4" />)}
                      {renderInput('lastName', 'Last Name', 'text', 'Your last name', lastName, (value) => handleFieldChange('lastName', value), true, <User className="w-4 h-4" />)}
                      {renderInput('phone', 'Phone Number', 'tel', '+1 (555) 123-4567', phone, (value) => handleFieldChange('phone', value), true, <Phone className="w-4 h-4" />)}
                      
                      {/* Gender Selection */}
                      <div className="space-y-2">
                        <Label htmlFor="gender" className="text-sm font-medium text-white/80">
                          Gender <span className="text-red-500">*</span>
                        </Label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => handleFieldChange('gender', 'brother')}
                            className={`p-3 text-center rounded-lg border-2 transition-all duration-200 ${
                              gender === 'brother'
                                ? 'border-gold-400 bg-gold-400 text-navy-900'
                                : 'border-white/15 text-white/70 hover:border-gold-400/50 hover:bg-gold-400/10'
                            }`}
                          >
                            Brother
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFieldChange('gender', 'sister')}
                            className={`p-3 text-center rounded-lg border-2 transition-all duration-200 ${
                              gender === 'sister'
                                ? 'border-gold-400 bg-gold-400 text-navy-900'
                                : 'border-white/15 text-white/70 hover:border-gold-400/50 hover:bg-gold-400/10'
                            }`}
                          >
                            Sister
                          </button>
                        </div>
                        {touched.gender && errors.gender && (
                          <p className="text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {errors.gender}
                          </p>
                        )}
                      </div>
                      
                      {renderInput('pocCode', 'POC Verification Code', 'text', 'Enter POC verification code', pocCode, (value) => handleFieldChange('pocCode', value), true, <Shield className="w-4 h-4" />)}
                      <div className="text-sm text-white/50 bg-white/5 p-3 rounded-lg border border-white/10">
                        <strong>Note:</strong> This code is provided by your organization to verify you are a Point of Contact (POC).
                      </div>
                    </div>
                  )}
                  
                  {renderInput('email', 'Email', 'email', 'hello@example.com', email, (value) => handleFieldChange('email', value), true, <Mail className="w-4 h-4" />)}
                  
                  {!isForgotPassword && (
                    <div className="space-y-4">
                      {renderInput('password', 'Password', showPassword ? 'text' : 'password', '', password, (value) => handleFieldChange('password', value), true, <Lock className="w-4 h-4" />, 
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-white/40 hover:text-white/70 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      )}
                      {isSignUp && (
                        <div className="text-sm text-white/50">
                          Password must be at least 6 characters long
                        </div>
                      )}
                    </div>
                  )}

                  {/* Additional Options */}
                  {!isForgotPassword && !isSignUp && (
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setIsForgotPassword(true)}
                        className="text-sm text-gold-400 hover:text-gold-300 hover:underline font-medium"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full h-11 bg-gold-400 hover:bg-gold-300 text-navy-900 font-medium rounded-lg shadow-lg button-glow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Processing...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span>{isForgotPassword ? "Send Reset Link" : (isSignUp ? "Create Account" : "Sign In")}</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    )}
                  </Button>
                </>
              )}
            </form>

            {/* Footer Links */}
            <div className="text-center space-y-4">
              {isForgotPassword ? (
                <div className="text-sm text-white/50">
                  Remember your password?{" "}
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(false)}
                    className="text-gold-400 hover:text-gold-300 hover:underline font-medium"
                  >
                    Sign in here
                  </button>
                </div>
              ) : isSignUp ? (
                <div className="text-sm text-white/50">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setIsSignUp(false)}
                    className="text-gold-400 hover:text-gold-300 hover:underline font-medium"
                  >
                    Sign in here
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm text-white/50">
                    New to volunteering at the UMMA?{" "}
                    <button
                      type="button"
                      onClick={() => setIsSignUp(true)}
                      className="text-gold-400 hover:text-gold-300 hover:underline font-medium"
                    >
                      Create an account
                    </button>
                  </div>
                  <div className="text-sm text-white/50">
                    <button
                      type="button"
                      onClick={() => setIsForgotPassword(true)}
                      className="text-gold-400 hover:text-gold-300 hover:underline font-medium"
                    >
                      Forgot your password?
                    </button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
