
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Heart, Calendar, MessageSquare, Star } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-100">
      {/* Header */}
      <header className="border-b border-amber-200 bg-white/90 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-amber-800 bg-clip-text text-transparent">
              EasyEvent
            </h1>
          </div>
          <Button onClick={() => navigate("/login")} variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50">
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-6xl font-bold mb-8 bg-gradient-to-r from-amber-600 to-amber-800 bg-clip-text text-transparent leading-tight">
          Streamlined Event Planning
        </h2>
        <p className="text-xl text-gray-700 mb-10 max-w-4xl mx-auto leading-relaxed">
          Plan and coordinate events with ease. Connect with your team, manage volunteer schedules, 
          and keep everyone informed with simple, effective tools.
        </p>
        <div className="flex gap-6 justify-center">
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-8 py-4 text-lg rounded-xl shadow-lg"
            onClick={() => navigate("/login")}
          >
            Get Started
          </Button>
          <Button size="lg" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50 px-8 py-4 text-lg rounded-xl">
            Learn More
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20">
        <h3 className="text-4xl font-bold text-center mb-16 text-gray-800">Why Choose EasyEvent?</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <Card className="hover:shadow-xl transition-all duration-300 border-amber-200 bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Star className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-amber-800">Smart Planning</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center text-gray-600 leading-relaxed">
                Get helpful suggestions for event structure and volunteer roles. Make planning efficient and organized.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl transition-all duration-300 border-amber-200 bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-amber-800">Real-Time Updates</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center text-gray-600 leading-relaxed">
                Track volunteer signups and availability as they happen. Stay informed about who's participating and what roles need filling.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl transition-all duration-300 border-amber-200 bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-amber-800">Automatic Reminders</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center text-gray-600 leading-relaxed">
                Send timely notifications to keep volunteers informed. Reduce no-shows with well-timed reminders.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl transition-all duration-300 border-amber-200 bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-amber-800">Easy Sharing</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center text-gray-600 leading-relaxed">
                Share your event with a simple link. No complicated setup required for volunteers to sign up and participate.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-amber-500 to-amber-600 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-4xl font-bold mb-6">Ready to Simplify Your Events?</h3>
          <p className="text-xl mb-10 opacity-95 max-w-2xl mx-auto leading-relaxed">
            Join event organizers who've streamlined their coordination process and improved volunteer participation.
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            className="bg-white text-amber-600 hover:bg-amber-50 px-8 py-4 text-lg rounded-xl shadow-lg"
            onClick={() => navigate("/login")}
          >
            Start Planning Today
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-amber-50 border-t border-amber-200 py-12">
        <div className="container mx-auto px-4 text-center text-amber-700">
          <p className="text-lg">&copy; 2025 EasyEvent. Streamlined event coordination.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
