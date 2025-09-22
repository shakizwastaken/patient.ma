"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Lock,
  User,
  Calendar,
} from "lucide-react";
import { api } from "@/trpc/react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const createNoteSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  content: z
    .string()
    .min(1, "Content is required")
    .max(5000, "Content too long"),
  isPrivate: z.boolean().default(true),
});

const updateNoteSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  content: z
    .string()
    .min(1, "Content is required")
    .max(5000, "Content too long"),
  isPrivate: z.boolean(),
});

type CreateNoteForm = z.infer<typeof createNoteSchema>;
type UpdateNoteForm = z.infer<typeof updateNoteSchema>;

interface PatientNotesProps {
  patientId: string;
}

export function PatientNotes({ patientId }: PatientNotesProps) {
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [viewDialogOpen, setViewDialogOpen] = React.useState(false);
  const [selectedNote, setSelectedNote] = React.useState<any>(null);

  // Fetch notes
  const {
    data: notes = [],
    isLoading,
    refetch,
  } = api.patients.getNotes.useQuery({ patientId });

  const utils = api.useUtils();

  // Create note mutation
  const createNote = api.patients.createNote.useMutation({
    onSuccess: async () => {
      await utils.patients.getNotes.invalidate({ patientId });
      setCreateDialogOpen(false);
      toast.success("Note created successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create note");
    },
  });

  // Update note mutation
  const updateNote = api.patients.updateNote.useMutation({
    onSuccess: async () => {
      await utils.patients.getNotes.invalidate({ patientId });
      setEditDialogOpen(false);
      setSelectedNote(null);
      toast.success("Note updated successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update note");
    },
  });

  // Delete note mutation
  const deleteNote = api.patients.deleteNote.useMutation({
    onSuccess: async () => {
      await utils.patients.getNotes.invalidate({ patientId });
      toast.success("Note deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete note");
    },
  });

  // Create note form
  const createForm = useForm<CreateNoteForm>({
    resolver: zodResolver(createNoteSchema),
    defaultValues: {
      title: "",
      content: "",
      isPrivate: true,
    },
  });

  // Update note form
  const updateForm = useForm<UpdateNoteForm>({
    resolver: zodResolver(updateNoteSchema),
    defaultValues: {
      id: "",
      title: "",
      content: "",
      isPrivate: false,
    },
  });

  const handleCreateNote = (data: CreateNoteForm) => {
    createNote.mutate({
      patientId,
      ...data,
    });
  };

  const handleUpdateNote = (data: UpdateNoteForm) => {
    updateNote.mutate(data);
  };

  const handleViewNote = (note: any) => {
    setSelectedNote(note);
    setViewDialogOpen(true);
  };

  const handleEditNote = (note: any) => {
    setSelectedNote(note);
    updateForm.reset({
      id: note.id,
      title: note.title,
      content: note.content,
      isPrivate: note.isPrivate,
    });
    setEditDialogOpen(true);
  };

  const handleDeleteNote = (noteId: string) => {
    if (confirm("Are you sure you want to delete this note?")) {
      deleteNote.mutate({ id: noteId });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="bg-muted h-6 w-32 animate-pulse rounded" />
          <div className="bg-muted h-4 w-48 animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-muted h-24 animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Patient Notes</CardTitle>
              <CardDescription>
                Keep track of important information about this patient
              </CardDescription>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Note
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Note</DialogTitle>
                  <DialogDescription>
                    Create a new note for this patient
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={createForm.handleSubmit(handleCreateNote)}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        {...createForm.register("title")}
                        placeholder="Enter note title"
                      />
                      {createForm.formState.errors.title && (
                        <p className="text-sm text-red-500">
                          {createForm.formState.errors.title.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="content">Content</Label>
                      <Textarea
                        id="content"
                        {...createForm.register("content")}
                        placeholder="Enter note content"
                        rows={6}
                      />
                      {createForm.formState.errors.content && (
                        <p className="text-sm text-red-500">
                          {createForm.formState.errors.content.message}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isPrivate"
                        checked={createForm.watch("isPrivate")}
                        onCheckedChange={(checked) =>
                          createForm.setValue("isPrivate", checked)
                        }
                      />
                      <Label htmlFor="isPrivate">Private note</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createNote.isPending}>
                      {createNote.isPending ? "Creating..." : "Create Note"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {notes.length === 0 ? (
            <div className="py-8 text-center">
              <div className="text-muted-foreground mb-4">
                <User className="mx-auto h-12 w-12" />
              </div>
              <h3 className="text-lg font-medium">No notes yet</h3>
              <p className="text-muted-foreground mb-4">
                Start documenting important information about this patient
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Note
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="hover:bg-muted/50 cursor-pointer rounded-lg border p-4"
                  onClick={() => handleViewNote(note)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <h4 className="font-medium">{note.title}</h4>
                        {note.isPrivate && (
                          <Badge variant="secondary" className="text-xs">
                            <Lock className="mr-1 h-3 w-3" />
                            Private
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground mb-3 line-clamp-3 text-sm">
                        {note.content}
                      </p>
                      <div className="text-muted-foreground flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {note.author.name}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(
                            new Date(note.createdAt),
                            "MMM d, yyyy 'at' h:mm a",
                            {
                              locale: fr,
                            },
                          )}
                        </div>
                        {note.updatedAt !== note.createdAt && (
                          <div className="text-xs">(edited)</div>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleViewNote(note)}>
                          <User className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditNote(note)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteNote(note.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Note Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
            <DialogDescription>Update the note details</DialogDescription>
          </DialogHeader>
          <form onSubmit={updateForm.handleSubmit(handleUpdateNote)}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  {...updateForm.register("title")}
                  placeholder="Enter note title"
                />
                {updateForm.formState.errors.title && (
                  <p className="text-sm text-red-500">
                    {updateForm.formState.errors.title.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-content">Content</Label>
                <Textarea
                  id="edit-content"
                  {...updateForm.register("content")}
                  placeholder="Enter note content"
                  rows={6}
                />
                {updateForm.formState.errors.content && (
                  <p className="text-sm text-red-500">
                    {updateForm.formState.errors.content.message}
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isPrivate"
                  checked={updateForm.watch("isPrivate")}
                  onCheckedChange={(checked) =>
                    updateForm.setValue("isPrivate", checked)
                  }
                />
                <Label htmlFor="edit-isPrivate">Private note</Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateNote.isPending}>
                {updateNote.isPending ? "Updating..." : "Update Note"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Note Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle>{selectedNote?.title}</DialogTitle>
              {selectedNote?.isPrivate && (
                <Badge variant="secondary" className="text-xs">
                  <Lock className="mr-1 h-3 w-3" />
                  Private
                </Badge>
              )}
            </div>
            <DialogDescription>Note details and information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Content</Label>
              <div className="bg-muted/50 rounded-md border p-4">
                <p className="text-sm whitespace-pre-wrap">
                  {selectedNote?.content}
                </p>
              </div>
            </div>
            <div className="text-muted-foreground flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>Created by {selectedNote?.author?.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {selectedNote?.createdAt &&
                      format(
                        new Date(selectedNote.createdAt),
                        "MMM d, yyyy 'at' h:mm a",
                        { locale: fr },
                      )}
                  </span>
                </div>
              </div>
              {selectedNote?.updatedAt !== selectedNote?.createdAt && (
                <div className="text-xs">
                  Last edited:{" "}
                  {selectedNote?.updatedAt &&
                    format(
                      new Date(selectedNote.updatedAt),
                      "MMM d, yyyy 'at' h:mm a",
                      { locale: fr },
                    )}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setViewDialogOpen(false);
                handleEditNote(selectedNote);
              }}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
