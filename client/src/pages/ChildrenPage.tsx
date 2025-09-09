import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { Plus, Users, Edit, Trash2, User, ArrowLeft } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { insertChildSchema, type Child } from '@shared/schema';
import { z } from 'zod';

const createChildSchema = insertChildSchema.omit({ userId: true }).extend({
  name: z.string().min(1, 'Name is required'),
  grade: z.string().min(1, 'Grade is required'),
});

type CreateChildData = z.infer<typeof createChildSchema>;

export default function ChildrenPage() {
  const { user, loading: authLoading } = useAuthGuard();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [formData, setFormData] = useState<CreateChildData>({
    name: '',
    grade: '',
    birthYear: null,
  });

  // Fetch children
  const { data: children = [], isLoading: childrenLoading } = useQuery<Child[]>({
    queryKey: ['/api/children'],
    enabled: !!user,
  });
  
  // Debug: log children data
  console.log('Children data from API:', children);
  console.log('Children loading:', childrenLoading);
  console.log('Current user:', user);

  // Create child mutation
  const createChildMutation = useMutation({
    mutationFn: async (data: CreateChildData) => {
      return apiRequest('POST', '/api/children', {
        ...data,
        userId: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/children'] });
      setIsAddDialogOpen(false);
      setFormData({ name: '', grade: '', birthYear: null });
      toast({
        title: "Child added",
        description: "Child has been added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add child",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Update child mutation
  const updateChildMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateChildData> }) => {
      return apiRequest('PATCH', `/api/children/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/children'] });
      setEditingChild(null);
      setFormData({ name: '', grade: '', birthYear: null });
      toast({
        title: "Child updated",
        description: "Child information has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update child",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Delete child mutation
  const deleteChildMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/children/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/children'] });
      toast({
        title: "Child removed",
        description: "Child has been removed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to remove child",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      createChildSchema.parse(formData);
      
      if (editingChild) {
        await updateChildMutation.mutateAsync({
          id: editingChild.id,
          data: formData,
        });
      } else {
        await createChildMutation.mutateAsync(formData);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation error",
          description: error.errors[0]?.message || "Please check your input",
          variant: "destructive",
        });
      }
    }
  };

  const handleEdit = (child: Child) => {
    setEditingChild(child);
    setFormData({
      name: child.name,
      grade: child.grade,
      birthYear: child.birthYear,
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (child: Child) => {
    if (confirm(`Are you sure you want to remove ${child.name}? This will not delete their documents.`)) {
      await deleteChildMutation.mutateAsync(child.id);
    }
  };

  const resetForm = () => {
    setEditingChild(null);
    setFormData({ name: '', grade: '', birthYear: null });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/app')}
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Manage Children
              </h1>
            </div>

            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              setIsAddDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg hover:shadow-xl transition-shadow" data-testid="button-add-child">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Child
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                    {editingChild ? 'Edit Child' : 'Add New Child'}
                  </DialogTitle>
                  <DialogDescription className="text-slate-600 dark:text-slate-400">
                    {editingChild ? 'Update your child\'s information.' : 'Add a new child to organize their school documents.'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter child's name"
                      required
                      data-testid="input-child-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="grade">Grade *</Label>
                    <Select value={formData.grade} onValueChange={(value) => setFormData({ ...formData, grade: value })}>
                      <SelectTrigger data-testid="select-child-grade">
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PreK">Pre-K</SelectItem>
                        <SelectItem value="K">Kindergarten</SelectItem>
                        <SelectItem value="1st">1st Grade</SelectItem>
                        <SelectItem value="2nd">2nd Grade</SelectItem>
                        <SelectItem value="3rd">3rd Grade</SelectItem>
                        <SelectItem value="4th">4th Grade</SelectItem>
                        <SelectItem value="5th">5th Grade</SelectItem>
                        <SelectItem value="6th">6th Grade</SelectItem>
                        <SelectItem value="7th">7th Grade</SelectItem>
                        <SelectItem value="8th">8th Grade</SelectItem>
                        <SelectItem value="9th">9th Grade</SelectItem>
                        <SelectItem value="10th">10th Grade</SelectItem>
                        <SelectItem value="11th">11th Grade</SelectItem>
                        <SelectItem value="12th">12th Grade</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birthYear">Birth Year (Optional)</Label>
                    <Input
                      id="birthYear"
                      type="number"
                      value={formData.birthYear || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        birthYear: e.target.value ? parseInt(e.target.value) : null 
                      })}
                      placeholder="e.g. 2015"
                      min="2000"
                      max={new Date().getFullYear()}
                      data-testid="input-child-birth-year"
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsAddDialogOpen(false);
                        resetForm();
                      }}
                      className="flex-1"
                      data-testid="button-cancel-child"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                      disabled={createChildMutation.isPending || updateChildMutation.isPending}
                      data-testid="button-save-child"
                    >
                      {createChildMutation.isPending || updateChildMutation.isPending
                        ? 'Saving...'
                        : editingChild
                        ? 'Update Child'
                        : 'Add Child'
                      }
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 lg:pb-6">
        {childrenLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : children.length === 0 ? (
          <Card className="text-center py-12 bg-white/60 backdrop-blur-sm shadow-xl border-0">
            <CardContent>
              <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <User className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Children Added</h3>
              <p className="text-gray-600 mb-6">
                Add your children to organize their school documents by student.
              </p>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg hover:shadow-xl transition-shadow"
                data-testid="button-add-first-child"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Child
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {children.map((child) => (
              <Card key={child.id} className="bg-white/60 backdrop-blur-sm shadow-xl border-0 hover:shadow-2xl transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg text-gray-900" data-testid={`text-child-name-${child.id}`}>
                          {child.name}
                        </CardTitle>
                        <p className="text-sm text-gray-600" data-testid={`text-child-grade-${child.id}`}>
                          Grade {child.grade}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(child)}
                        data-testid={`button-edit-child-${child.id}`}
                      >
                        <Edit className="w-4 h-4 text-gray-500 hover:text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(child)}
                        data-testid={`button-delete-child-${child.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {child.birthYear && (
                    <p className="text-sm text-gray-500 mb-2">
                      Born in {child.birthYear}
                    </p>
                  )}
                  <div className="text-xs text-gray-400">
                    Added {new Date(child.createdAt).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}