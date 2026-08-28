"use client";

import React, { useState, useEffect } from "react";
import {
  getCustomObjectDefinitions,
  createCustomObjectDefinition,
} from "@/app/actions/custom-objects";
import { CustomObjectDefinition } from "@/db/schema";
import { toast } from "sonner";
import {
  Boxes,
  Plus,
  ArrowRight,
  RefreshCw,
  Folder,
  Home,
  Truck,
  GraduationCap,
  Briefcase,
  Layers,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export function CustomObjectsStudio() {
  const [objects, setObjects] = useState<CustomObjectDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newObj, setNewObj] = useState({
    singularName: "",
    pluralName: "",
    slug: "",
    description: "",
    icon: "Folder",
    primaryFieldKey: "title",
  });

  const fetchObjects = async () => {
    setLoading(true);
    try {
      const data = await getCustomObjectDefinitions();
      setObjects(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load custom objects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObjects();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newObj.singularName || !newObj.pluralName) return;

    try {
      const created = await createCustomObjectDefinition({
        singularName: newObj.singularName,
        pluralName: newObj.pluralName,
        slug: newObj.slug || newObj.pluralName.toLowerCase().replace(/[^a-z0-9]/g, "-"),
        description: newObj.description,
        icon: newObj.icon,
        primaryFieldKey: newObj.primaryFieldKey,
      });

      toast.success(`Custom Entity "${created.pluralName}" created successfully!`);
      setShowAdd(false);
      setNewObj({ singularName: "", pluralName: "", slug: "", description: "", icon: "Folder", primaryFieldKey: "title" });
      fetchObjects();
    } catch (err: any) {
      toast.error(err.message || "Failed to create custom entity");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-primary" />
            <h3 className="text-base font-bold">Custom Business Objects Modeler</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Model proprietary business records (e.g. Properties, Shipments, Healthcare Encounters) as first-class CRM objects.
          </p>
        </div>

        <Button size="sm" onClick={() => setShowAdd(true)} className="text-xs font-semibold gap-1.5 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> New Custom Entity
        </Button>
      </div>

      {showAdd && (
        <Card className="border-primary/30 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Define New Custom Entity</CardTitle>
            <CardDescription className="text-xs">
              This entity will automatically generate a dedicated CRUD data table and detail view.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Singular Name</Label>
                  <Input
                    required
                    placeholder="e.g. Property"
                    value={newObj.singularName}
                    onChange={(e) => setNewObj({ ...newObj, singularName: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Plural Name</Label>
                  <Input
                    required
                    placeholder="e.g. Properties"
                    value={newObj.pluralName}
                    onChange={(e) => setNewObj({ ...newObj, pluralName: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">URL Slug</Label>
                  <Input
                    placeholder="e.g. properties"
                    value={newObj.slug}
                    onChange={(e) => setNewObj({ ...newObj, slug: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Description / Scope</Label>
                <Input
                  placeholder="e.g. Real estate listings, towers, villas, and carpet square footage"
                  value={newObj.description}
                  onChange={(e) => setNewObj({ ...newObj, description: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAdd(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="font-semibold">
                  Register Custom Object
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="py-12 flex items-center justify-center text-muted-foreground gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-primary" />
          <span className="text-xs">Loading custom entities...</span>
        </div>
      ) : objects.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground text-xs">
            No custom objects modeled yet. Click "New Custom Entity" to model your industry records.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {objects.map((obj) => (
            <Card key={obj.id} className="border-border hover:border-primary/40 transition-all shadow-xs flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Boxes className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">/{obj.slug}</span>
                </div>
                <CardTitle className="text-base font-bold mt-2">{obj.pluralName}</CardTitle>
                <CardDescription className="text-xs">
                  {obj.description || `Custom business entity (${obj.singularName})`}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="mt-2 pt-4 border-t border-border flex items-center justify-between">
                  <span className="text-[10px] font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    Active Entity
                  </span>
                  <Link href={`/dashboard/objects/${obj.slug}`}>
                    <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
                      Open Records <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
