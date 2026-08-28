"use client";

import React, { useState } from "react";
import {
  Package,
  Plus,
  Search,
  Tag,
  DollarSign,
  Layers,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Filter,
  BarChart3,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createProduct, updateProduct, deleteProduct } from "@/app/actions/products";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  unitPrice: number;
  currency: string;
  taxRatePercent: number;
  category: string;
  isActive: boolean;
  createdAt: string;
}

interface ProductsClientProps {
  user: any;
  initialProducts: any[];
}

const CATEGORIES = [
  "Software Licenses",
  "Professional Services",
  "Hardware & Equipment",
  "Subscription Plans",
  "Logistics & Freight",
  "Consulting",
  "Custom Development",
  "General",
];

export default function ProductsClient({ user, initialProducts }: ProductsClientProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Modal States
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    sku: "",
    description: "",
    unitPrice: "",
    currency: "INR",
    taxRatePercent: "18",
    category: "Professional Services",
    isActive: true,
  });

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      (p.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === "all" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalCatalogValue = products.reduce((sum, p) => sum + p.unitPrice, 0);
  const activeCount = products.filter((p) => p.isActive).length;
  const categoriesCount = Array.from(new Set(products.map((p) => p.category))).length;

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setForm({
      name: "",
      sku: "",
      description: "",
      unitPrice: "",
      currency: "INR",
      taxRatePercent: "18",
      category: "Professional Services",
      isActive: true,
    });
    setShowCreateDialog(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setForm({
      name: p.name,
      sku: p.sku || "",
      description: p.description || "",
      unitPrice: p.unitPrice.toString(),
      currency: p.currency,
      taxRatePercent: p.taxRatePercent.toString(),
      category: p.category,
      isActive: p.isActive,
    });
    setShowCreateDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Product name is required");
      return;
    }

    setFormLoading(true);
    try {
      if (editingProduct) {
        const updated = await updateProduct(editingProduct.id, {
          name: form.name.trim(),
          sku: form.sku.trim() || undefined,
          description: form.description.trim() || undefined,
          unitPrice: Number(form.unitPrice) || 0,
          currency: form.currency,
          taxRatePercent: Number(form.taxRatePercent) || 0,
          category: form.category,
          isActive: form.isActive,
        });
        setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? (updated as Product) : p)));
        toast.success("Product updated successfully");
      } else {
        const created = await createProduct({
          name: form.name.trim(),
          sku: form.sku.trim() || undefined,
          description: form.description.trim() || undefined,
          unitPrice: Number(form.unitPrice) || 0,
          currency: form.currency,
          taxRatePercent: Number(form.taxRatePercent) || 18,
          category: form.category,
          isActive: form.isActive,
        });
        setProducts((prev) => [created as Product, ...prev]);
        toast.success("Product created in price book");
      }
      setShowCreateDialog(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save product");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product from the catalog?")) return;
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success("Product removed from catalog");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete product");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" /> Product & Price Book Catalog
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Maintain master items, SKU codes, standard pricing, and tax rates for proposals and quotes.
          </p>
        </div>

        <Button onClick={handleOpenCreate} className="gap-1.5 shadow-sm">
          <Plus className="w-4 h-4" /> Add Product / Service
        </Button>
      </div>

      {/* Metric Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-border bg-card">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground font-medium">Total Catalog Items</span>
            <div className="text-xl font-bold font-mono text-foreground mt-1">{products.length}</div>
            <span className="text-[11px] text-muted-foreground mt-0.5 block">{activeCount} active items</span>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground font-medium">Active Categories</span>
            <div className="text-xl font-bold font-mono text-foreground mt-1">{categoriesCount}</div>
            <span className="text-[11px] text-muted-foreground mt-0.5 block">Product lines</span>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground font-medium">Average Unit Price</span>
            <div className="text-xl font-bold font-mono text-primary mt-1">
              ₹{products.length > 0 ? Math.round(totalCatalogValue / products.length).toLocaleString("en-IN") : "0"}
            </div>
            <span className="text-[11px] text-muted-foreground mt-0.5 block">Per line item</span>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card">
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground font-medium">Standard Tax Bracket</span>
            <div className="text-xl font-bold font-mono text-foreground mt-1">18% GST</div>
            <span className="text-[11px] text-muted-foreground mt-0.5 block">Configurable per item</span>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border">
        <div className="flex flex-1 items-center gap-2 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by product name, SKU, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 text-xs bg-background border-border"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Category:
          </span>
          <Select value={selectedCategory} onValueChange={(val) => val && setSelectedCategory(val)}>
            <SelectTrigger className="w-44 h-8 text-xs bg-background border-border">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Catalog Table */}
      <Card className="border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Product / Service</th>
                <th className="px-4 py-3 font-semibold">SKU Code</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Unit Price (INR)</th>
                <th className="px-4 py-3 font-semibold">Tax Rate</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground italic">
                    No products found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground">{p.name}</div>
                      {p.description && (
                        <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{p.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {p.sku || <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-muted px-2 py-0.5 rounded text-[11px] font-medium border border-border">
                        {p.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-foreground">
                      ₹{p.unitPrice.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{p.taxRatePercent}%</td>
                    <td className="px-4 py-3">
                      {p.isActive ? (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">
                          Archived
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create / Edit Modal */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg border border-border bg-card">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Product / Item" : "Add New Item to Price Book"}</DialogTitle>
            <DialogDescription>
              Define item description, standard billing unit rates, and tax parameters.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="prod-name">Product / Service Name *</Label>
              <Input
                id="prod-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Enterprise SLA Annual Support"
                disabled={formLoading}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="prod-sku">SKU / Item Code</Label>
                <Input
                  id="prod-sku"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  placeholder="e.g. SLA-ENT-01"
                  disabled={formLoading}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="prod-category">Category</Label>
                <Select value={form.category} onValueChange={(val) => val && setForm({ ...form, category: val })}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="prod-price">Standard Unit Price (INR) *</Label>
                <Input
                  id="prod-price"
                  type="number"
                  value={form.unitPrice}
                  onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                  placeholder="e.g. 75000"
                  disabled={formLoading}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="prod-tax">GST / Tax Rate (%)</Label>
                <Input
                  id="prod-tax"
                  type="number"
                  value={form.taxRatePercent}
                  onChange={(e) => setForm({ ...form, taxRatePercent: e.target.value })}
                  placeholder="18"
                  disabled={formLoading}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="prod-desc">Description / Scope of Work</Label>
              <Input
                id="prod-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief summary of item deliverables..."
                disabled={formLoading}
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="prod-active"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="rounded border-border"
              />
              <Label htmlFor="prod-active" className="text-xs text-muted-foreground cursor-pointer">
                Item is actively available for quoting & invoicing
              </Label>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)} disabled={formLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading ? "Saving..." : editingProduct ? "Update Product" : "Save to Catalog"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
