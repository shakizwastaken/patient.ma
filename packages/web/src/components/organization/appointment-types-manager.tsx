"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Clock, Palette, Eye, EyeOff } from "lucide-react";

// Form schemas
const appointmentTypeSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(100, "Nom trop long"),
  description: z.string().optional(),
  defaultDurationMinutes: z
    .number()
    .min(5, "La durée minimum est de 5 minutes")
    .max(480, "La durée maximum est de 8 heures"),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, "Format de couleur invalide (hex)"),
});

type AppointmentTypeFormValues = z.infer<typeof appointmentTypeSchema>;

// Predefined color options
const COLOR_OPTIONS = [
  { value: "#3b82f6", label: "Bleu", bg: "bg-blue-500" },
  { value: "#ef4444", label: "Rouge", bg: "bg-red-500" },
  { value: "#10b981", label: "Vert", bg: "bg-emerald-500" },
  { value: "#f59e0b", label: "Orange", bg: "bg-amber-500" },
  { value: "#8b5cf6", label: "Violet", bg: "bg-violet-500" },
  { value: "#06b6d4", label: "Cyan", bg: "bg-cyan-500" },
  { value: "#84cc16", label: "Lime", bg: "bg-lime-500" },
  { value: "#f97316", label: "Orange foncé", bg: "bg-orange-500" },
  { value: "#6b7280", label: "Gris", bg: "bg-gray-500" },
  { value: "#ec4899", label: "Rose", bg: "bg-pink-500" },
];

// Duration options (in minutes)
const DURATION_OPTIONS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "1 heure" },
  { value: 90, label: "1h30" },
  { value: 120, label: "2 heures" },
  { value: 180, label: "3 heures" },
  { value: 240, label: "4 heures" },
];

export function AppointmentTypesManager() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const [showCustomColorInput, setShowCustomColorInput] = useState(false);

  const utils = api.useUtils();

  // Reset custom color input when dialogs open/close
  React.useEffect(() => {
    if (!isCreateDialogOpen) {
      setShowCustomColorInput(false);
    }
  }, [isCreateDialogOpen]);

  React.useEffect(() => {
    if (!isEditDialogOpen) {
      setShowCustomColorInput(false);
    }
  }, [isEditDialogOpen]);

  // Queries and mutations
  const { data: appointmentTypes, isLoading } =
    api.appointmentTypes.getAppointmentTypes.useQuery();

  const createMutation = api.appointmentTypes.createAppointmentType.useMutation(
    {
      onSuccess: () => {
        toast.success("Type de rendez-vous créé avec succès");
        setIsCreateDialogOpen(false);
        utils.appointmentTypes.getAppointmentTypes.invalidate();
      },
      onError: (error) => {
        toast.error(error.message || "Erreur lors de la création");
      },
    },
  );

  const updateMutation = api.appointmentTypes.updateAppointmentType.useMutation(
    {
      onSuccess: () => {
        toast.success("Type de rendez-vous mis à jour avec succès");
        setIsEditDialogOpen(false);
        setEditingType(null);
        utils.appointmentTypes.getAppointmentTypes.invalidate();
      },
      onError: (error) => {
        toast.error(error.message || "Erreur lors de la mise à jour");
      },
    },
  );

  const deleteMutation = api.appointmentTypes.deleteAppointmentType.useMutation(
    {
      onSuccess: () => {
        toast.success("Type de rendez-vous supprimé avec succès");
        utils.appointmentTypes.getAppointmentTypes.invalidate();
      },
      onError: (error) => {
        toast.error(error.message || "Erreur lors de la suppression");
      },
    },
  );

  const toggleActiveMutation = api.appointmentTypes.toggleActive.useMutation({
    onSuccess: () => {
      toast.success("Statut mis à jour avec succès");
      utils.appointmentTypes.getAppointmentTypes.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erreur lors de la mise à jour");
    },
  });

  // Forms
  const createForm = useForm<AppointmentTypeFormValues>({
    resolver: zodResolver(appointmentTypeSchema),
    defaultValues: {
      name: "",
      description: "",
      defaultDurationMinutes: 30,
      color: "#3b82f6",
    },
  });

  const editForm = useForm<AppointmentTypeFormValues>({
    resolver: zodResolver(appointmentTypeSchema),
  });

  // Handlers
  const handleCreate = (values: AppointmentTypeFormValues) => {
    createMutation.mutate(values);
  };

  const handleEdit = (type: any) => {
    setEditingType(type);
    editForm.reset({
      name: type.name,
      description: type.description || "",
      defaultDurationMinutes: type.defaultDurationMinutes,
      color: type.color,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = (values: AppointmentTypeFormValues) => {
    if (!editingType) return;
    updateMutation.mutate({
      id: editingType.id,
      ...values,
    });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id });
  };

  const handleToggleActive = (id: string) => {
    toggleActiveMutation.mutate({ id });
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h${remainingMinutes}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Types de rendez-vous</CardTitle>
          <CardDescription>
            Chargement des types de rendez-vous...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Types de rendez-vous</CardTitle>
              <CardDescription>
                Gérez les types de rendez-vous et leurs durées par défaut
              </CardDescription>
            </div>
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un type
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Nouveau type de rendez-vous</DialogTitle>
                  <DialogDescription>
                    Créez un nouveau type de rendez-vous avec ses paramètres par
                    défaut.
                  </DialogDescription>
                </DialogHeader>
                <Form {...createForm}>
                  <form
                    onSubmit={createForm.handleSubmit(handleCreate)}
                    className="space-y-4"
                  >
                    <FormField
                      control={createForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom du type</FormLabel>
                          <FormControl>
                            <Input placeholder="ex: Consultation" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (optionnel)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Description du type de rendez-vous..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="defaultDurationMinutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Durée par défaut</FormLabel>
                          <Select
                            onValueChange={(value) =>
                              field.onChange(parseInt(value))
                            }
                            defaultValue={field.value.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionnez une durée" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {DURATION_OPTIONS.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value.toString()}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Couleur</FormLabel>
                          <div className="flex flex-wrap gap-2">
                            {COLOR_OPTIONS.map((color) => (
                              <button
                                key={color.value}
                                type="button"
                                className={`h-6 w-6 rounded-full border-2 ${
                                  field.value === color.value
                                    ? "border-primary scale-110"
                                    : "border-gray-200 hover:scale-105"
                                } transition-transform`}
                                style={{ backgroundColor: color.value }}
                                onClick={() => {
                                  field.onChange(color.value);
                                  setShowCustomColorInput(false);
                                }}
                                title={color.label}
                              />
                            ))}
                            <button
                              type="button"
                              className={`h-6 w-6 rounded-full border-2 border-dashed ${
                                showCustomColorInput
                                  ? "border-primary bg-primary/10"
                                  : "border-gray-300 hover:border-gray-400"
                              } flex items-center justify-center transition-colors`}
                              onClick={() => setShowCustomColorInput(true)}
                              title="Couleur personnalisée"
                            >
                              <span className="text-xs text-gray-500">+</span>
                            </button>
                          </div>
                          {showCustomColorInput && (
                            <div className="mt-2 space-y-2">
                              <div className="flex items-center gap-2">
                                <Input
                                  type="color"
                                  value={field.value}
                                  onChange={(e) =>
                                    field.onChange(e.target.value)
                                  }
                                  className="h-8 w-16"
                                />
                                <Input
                                  type="text"
                                  value={field.value}
                                  onChange={(e) => {
                                    if (
                                      /^#[0-9A-F]{6}$/i.test(e.target.value)
                                    ) {
                                      field.onChange(e.target.value);
                                    }
                                  }}
                                  placeholder="#000000"
                                  className="h-8 w-24 text-xs"
                                />
                              </div>
                              <p className="text-muted-foreground text-xs">
                                Couleur personnalisée: {field.value}
                              </p>
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                      >
                        Annuler
                      </Button>
                      <Button type="submit" disabled={createMutation.isPending}>
                        {createMutation.isPending ? "Création..." : "Créer"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {appointmentTypes && appointmentTypes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead>Couleur</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointmentTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{type.name}</div>
                        {type.description && (
                          <div className="text-muted-foreground text-sm">
                            {type.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Clock className="mr-2 h-4 w-4" />
                        {formatDuration(type.defaultDurationMinutes)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <div
                          className="mr-2 h-4 w-4 rounded-full border border-gray-200"
                          style={{ backgroundColor: type.color || "#3b82f6" }}
                        />
                        <span className="text-muted-foreground text-sm">
                          {type.color || "#3b82f6"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={type.isActive ? "default" : "secondary"}>
                        {type.isActive ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(type.id)}
                          disabled={toggleActiveMutation.isPending}
                        >
                          {type.isActive ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(type)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Supprimer le type de rendez-vous
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Êtes-vous sûr de vouloir supprimer "{type.name}"
                                ? Cette action ne peut pas être annulée.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(type.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center">
              <div className="text-muted-foreground">
                Aucun type de rendez-vous configuré
              </div>
              <div className="text-muted-foreground mt-2 text-sm">
                Créez votre premier type de rendez-vous pour commencer
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Modifier le type de rendez-vous</DialogTitle>
            <DialogDescription>
              Modifiez les paramètres de ce type de rendez-vous.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(handleUpdate)}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du type</FormLabel>
                    <FormControl>
                      <Input placeholder="ex: Consultation" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optionnel)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Description du type de rendez-vous..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="defaultDurationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Durée par défaut</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez une durée" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DURATION_OPTIONS.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value.toString()}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Couleur</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {COLOR_OPTIONS.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          className={`h-6 w-6 rounded-full border-2 ${
                            field.value === color.value
                              ? "border-primary scale-110"
                              : "border-gray-200 hover:scale-105"
                          } transition-transform`}
                          style={{ backgroundColor: color.value }}
                          onClick={() => {
                            field.onChange(color.value);
                            setShowCustomColorInput(false);
                          }}
                          title={color.label}
                        />
                      ))}
                      <button
                        type="button"
                        className={`h-6 w-6 rounded-full border-2 border-dashed ${
                          showCustomColorInput
                            ? "border-primary bg-primary/10"
                            : "border-gray-300 hover:border-gray-400"
                        } flex items-center justify-center transition-colors`}
                        onClick={() => setShowCustomColorInput(true)}
                        title="Couleur personnalisée"
                      >
                        <span className="text-xs text-gray-500">+</span>
                      </button>
                    </div>
                    {showCustomColorInput && (
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            type="color"
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="h-8 w-16"
                          />
                          <Input
                            type="text"
                            value={field.value}
                            onChange={(e) => {
                              if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                                field.onChange(e.target.value);
                              }
                            }}
                            placeholder="#000000"
                            className="h-8 w-24 text-xs"
                          />
                        </div>
                        <p className="text-muted-foreground text-xs">
                          Couleur personnalisée: {field.value}
                        </p>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending
                    ? "Mise à jour..."
                    : "Mettre à jour"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
