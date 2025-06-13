
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays, Users, DollarSign, Megaphone, Package, Trash2, Plus, Sparkles } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string;
  category: 'marketing' | 'supplies' | 'sponsors' | 'logistics' | 'other';
  dueDate: string;
  assigneeId?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'in_progress' | 'completed';
}

interface PreEventTasksManagerProps {
  tasks: Task[];
  onTasksChange: (tasks: Task[]) => void;
  contacts: any[];
  eventDate: string;
  eventDescription: string;
}

const PreEventTasksManager = ({ 
  tasks, 
  onTasksChange, 
  contacts, 
  eventDate, 
  eventDescription 
}: PreEventTasksManagerProps) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const taskCategories = [
    { value: 'marketing', label: 'Marketing', icon: Megaphone },
    { value: 'supplies', label: 'Supplies & Equipment', icon: Package },
    { value: 'sponsors', label: 'Sponsorships', icon: DollarSign },
    { value: 'logistics', label: 'Logistics', icon: CalendarDays },
    { value: 'other', label: 'Other', icon: Users }
  ];

  const generateAITasks = async () => {
    setIsGenerating(true);
    
    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const eventDateObj = new Date(eventDate);
    const twoWeeksBefore = new Date(eventDateObj);
    twoWeeksBefore.setDate(twoWeeksBefore.getDate() - 14);
    
    const oneWeekBefore = new Date(eventDateObj);
    oneWeekBefore.setDate(oneWeekBefore.getDate() - 7);
    
    const threeDaysBefore = new Date(eventDateObj);
    threeDaysBefore.setDate(threeDaysBefore.getDate() - 3);

    const aiGeneratedTasks: Task[] = [
      {
        id: crypto.randomUUID(),
        title: "Create event flyers and social media graphics",
        description: "Design promotional materials for the event including flyers, social media posts, and digital announcements",
        category: 'marketing',
        dueDate: twoWeeksBefore.toISOString().split('T')[0],
        priority: 'high',
        status: 'todo'
      },
      {
        id: crypto.randomUUID(),
        title: "Reach out to potential sponsors",
        description: "Contact local businesses and organizations for event sponsorship opportunities",
        category: 'sponsors',
        dueDate: twoWeeksBefore.toISOString().split('T')[0],
        priority: 'medium',
        status: 'todo'
      },
      {
        id: crypto.randomUUID(),
        title: "Order event supplies and equipment",
        description: "Purchase or rent tables, chairs, sound equipment, decorations, and other necessary items",
        category: 'supplies',
        dueDate: oneWeekBefore.toISOString().split('T')[0],
        priority: 'high',
        status: 'todo'
      },
      {
        id: crypto.randomUUID(),
        title: "Confirm venue setup and logistics",
        description: "Coordinate with venue staff about setup time, parking, and facility requirements",
        category: 'logistics',
        dueDate: threeDaysBefore.toISOString().split('T')[0],
        priority: 'high',
        status: 'todo'
      },
      {
        id: crypto.randomUUID(),
        title: "Send reminder announcements",
        description: "Send final reminders to community through all communication channels",
        category: 'marketing',
        dueDate: threeDaysBefore.toISOString().split('T')[0],
        priority: 'medium',
        status: 'todo'
      }
    ];

    onTasksChange([...tasks, ...aiGeneratedTasks]);
    setIsGenerating(false);
  };

  const addCustomTask = () => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: "",
      description: "",
      category: 'other',
      dueDate: eventDate,
      priority: 'medium',
      status: 'todo'
    };
    onTasksChange([...tasks, newTask]);
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    onTasksChange(tasks.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    ));
  };

  const removeTask = (taskId: string) => {
    onTasksChange(tasks.filter(task => task.id !== taskId));
  };

  const getCategoryIcon = (category: string) => {
    const categoryData = taskCategories.find(cat => cat.value === category);
    const Icon = categoryData?.icon || Users;
    return <Icon className="w-4 h-4" />;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-umma-100 text-umma-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold text-umma-800">Pre-Event Task Planning</h3>
          <p className="text-umma-600 text-sm">Generate and assign tasks needed before your event</p>
        </div>
        
        {tasks.length === 0 && (
          <Button 
            onClick={generateAITasks}
            disabled={isGenerating}
            className="bg-gradient-to-r from-umma-500 to-umma-700 hover:from-umma-600 hover:to-umma-800 text-white w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {isGenerating ? (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Generate AI Tasks
          </Button>
        )}
      </div>

      {isGenerating && (
        <Card className="border-umma-200 bg-white">
          <CardContent className="p-6 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-umma-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-umma-700">AI is analyzing your event and generating recommended tasks...</p>
          </CardContent>
        </Card>
      )}

      {tasks.length > 0 && (
        <div className="space-y-4">
          {tasks.map((task) => (
            <Card key={task.id} className="overflow-hidden bg-white border-umma-200">
              <CardContent className="p-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label className="text-umma-700">Task Title</Label>
                    <Input
                      value={task.title}
                      onChange={(e) => updateTask(task.id, { title: e.target.value })}
                      placeholder="Task title"
                      className="w-full border-umma-200 focus-visible:ring-umma-500"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-umma-700">Category</Label>
                      <Select 
                        value={task.category} 
                        onValueChange={(value) => updateTask(task.id, { category: value as Task['category'] })}
                      >
                        <SelectTrigger className="border-umma-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {taskCategories.map((category) => (
                            <SelectItem key={category.value} value={category.value}>
                              <div className="flex items-center space-x-2">
                                <category.icon className="w-4 h-4" />
                                <span>{category.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-umma-700">Due Date</Label>
                      <Input
                        type="date"
                        value={task.dueDate}
                        onChange={(e) => updateTask(task.id, { dueDate: e.target.value })}
                        className="border-umma-200 focus-visible:ring-umma-500"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-umma-700">Priority</Label>
                      <Select 
                        value={task.priority} 
                        onValueChange={(value) => updateTask(task.id, { priority: value as Task['priority'] })}
                      >
                        <SelectTrigger className="border-umma-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-umma-700">Assignee (Optional)</Label>
                      <Select 
                        value={task.assigneeId || ""} 
                        onValueChange={(value) => updateTask(task.id, { assigneeId: value })}
                      >
                        <SelectTrigger className="border-umma-200">
                          <SelectValue placeholder="Select assignee" />
                        </SelectTrigger>
                        <SelectContent>
                          {contacts.map((contact: any) => (
                            <SelectItem key={contact.id} value={contact.id}>
                              {contact.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex justify-between items-end">
                      <div className="flex items-center space-x-2">
                        {getCategoryIcon(task.category)}
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeTask(task.id)}
                        className="border-red-200 hover:border-red-300 hover:bg-red-50 text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-umma-700">Description</Label>
                    <Textarea
                      value={task.description}
                      onChange={(e) => updateTask(task.id, { description: e.target.value })}
                      placeholder="Task description and requirements"
                      rows={2}
                      className="border-umma-200 focus-visible:ring-umma-500"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Button 
        variant="outline" 
        onClick={addCustomTask}
        className="w-full border-umma-200 text-umma-800 hover:bg-umma-50 bg-gradient-to-r from-umma-500 to-umma-600 hover:from-umma-600 hover:to-umma-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Custom Task
      </Button>

      {tasks.length > 0 && (
        <Card className="bg-umma-50 border-umma-200">
          <CardContent className="p-4">
            <h4 className="font-medium mb-2 text-umma-800">Task Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-umma-600">Total Tasks:</span>
                <div className="font-semibold text-umma-800">{tasks.length}</div>
              </div>
              <div>
                <span className="text-umma-600">High Priority:</span>
                <div className="font-semibold text-red-600">
                  {tasks.filter(t => t.priority === 'high').length}
                </div>
              </div>
              <div>
                <span className="text-umma-600">Assigned:</span>
                <div className="font-semibold text-green-600">
                  {tasks.filter(t => t.assigneeId).length}
                </div>
              </div>
              <div>
                <span className="text-umma-600">Categories:</span>
                <div className="font-semibold text-umma-800">
                  {new Set(tasks.map(t => t.category)).size}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PreEventTasksManager;
