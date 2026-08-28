import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CornerDownRight, FolderTree, Image as ImageIcon, Loader2, Trash2 } from "lucide-react";

import { Banner, Card, FieldError, PageHeading, Select, StatCard } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

import {
  blankCategoryForm,
  categoryFormSchema,
  categoryToForm,
  countProductsByCategory,
  deleteCategory,
  fetchAdminCategories,
  saveCategory,
  uploadCategoryImage,
  type AdminCategory,
  type CategoryFormValues,
} from "@/lib/admin";
import { imageFor } from "@/lib/catalogue";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/categories")({
  component: CategoriesScreen,
});

type Editing = { mode: "new" } | { mode: "edit"; row: AdminCategory };

function CategoriesScreen() {
  const [editing, setEditing] = useState<Editing | null>(null);
  const queryClient = useQueryClient();

  const categories = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: fetchAdminCategories,
  });

  const counts = useQuery({
    queryKey: ["admin", "product-counts"],
    queryFn: countProductsByCategory,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "product-counts"] });
    // The storefront reads categories under its own key.
    void queryClient.invalidateQueries({ queryKey: ["categories"] });
  };

  const remove = useMutation({ mutationFn: deleteCategory, onSuccess: invalidate });

  const all = useMemo(() => categories.data ?? [], [categories.data]);
  const tops = all.filter((c) => !c.parent_slug).sort((a, b) => a.sort_order - b.sort_order);
  const childrenOf = (slug: string) =>
    all.filter((c) => c.parent_slug === slug).sort((a, b) => a.sort_order - b.sort_order);

  if (editing) {
    return (
      <CategoryForm
        editing={editing}
        categories={all}
        onDone={() => {
          invalidate();
          setEditing(null);
        }}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <>
      <PageHeading
        title="Categories"
        hint="What the Collections menu offers, and where each piece is filed. A category can sit under another one — that is how the four kinds of necklace set hang together."
      >
        <Button onClick={() => setEditing({ mode: "new" })}>Add category</Button>
      </PageHeading>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Categories" value={tops.length} tone="product" icon={FolderTree} />
        <StatCard
          label="Sub-categories"
          value={all.length - tops.length}
          tone="contact"
          hint="Nested one level"
        />
        <StatCard
          label="Unfiled pieces"
          value={counts.data?.["unfiled"] ?? 0}
          tone={counts.data?.["unfiled"] ? "bridal" : "settled"}
        />
      </div>

      {categories.error ? (
        <Banner tone="error">{(categories.error as Error).message}</Banner>
      ) : null}
      {remove.error ? <Banner tone="error">{(remove.error as Error).message}</Banner> : null}

      {categories.isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <ul className="space-y-3">
          {tops.map((top) => (
            <li key={top.slug}>
              <CategoryRow
                row={top}
                count={counts.data?.[top.slug] ?? 0}
                busy={remove.isPending && remove.variables === top.slug}
                childCount={childrenOf(top.slug).length}
                onEdit={() => setEditing({ mode: "edit", row: top })}
                onDelete={() => remove.mutate(top.slug)}
              />

              {childrenOf(top.slug).length > 0 ? (
                <ul className="mt-3 space-y-3 pl-6 sm:pl-10">
                  {childrenOf(top.slug).map((child) => (
                    <li key={child.slug}>
                      <CategoryRow
                        row={child}
                        nested
                        count={counts.data?.[child.slug] ?? 0}
                        busy={remove.isPending && remove.variables === child.slug}
                        childCount={0}
                        onEdit={() => setEditing({ mode: "edit", row: child })}
                        onDelete={() => remove.mutate(child.slug)}
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function CategoryRow({
  row,
  count,
  childCount,
  busy,
  nested,
  onEdit,
  onDelete,
}: {
  row: AdminCategory;
  count: number;
  childCount: number;
  busy: boolean;
  nested?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  // The foreign key would refuse it anyway; saying so first is more use than a
  // button that fails.
  const blocked = count > 0;

  function confirmDelete() {
    const warning =
      childCount > 0
        ? `Delete “${row.name}”?\n\nIts ${childCount} sub-categor${childCount === 1 ? "y" : "ies"} will not be deleted — they become top-level categories instead.`
        : `Delete “${row.name}”? This cannot be undone.`;
    if (confirm(warning)) onDelete();
  }

  return (
    <Card className="flex flex-wrap items-center gap-4 p-4">
      {nested ? (
        <CornerDownRight
          className="h-4 w-4 shrink-0 text-warmgrey"
          strokeWidth={1.5}
          aria-hidden="true"
        />
      ) : null}

      <img
        src={imageFor(row.image_key)}
        alt=""
        aria-hidden="true"
        className="h-14 w-14 shrink-0 rounded-lg object-cover"
      />

      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-primary", nested ? "font-medium" : "font-semibold")}>
          {row.name}
        </p>
        <p className="nums truncate text-xs text-warmgrey">
          /collections/{row.slug} · {count} {count === 1 ? "piece" : "pieces"}
          {childCount > 0 ? ` · ${childCount} sub` : ""}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin text-warmgrey" aria-hidden="true" />
        ) : null}
        <Button variant="outline" size="sm" onClick={onEdit}>
          Edit
        </Button>
        <button
          type="button"
          disabled={busy || blocked}
          onClick={confirmDelete}
          title={
            blocked
              ? `${count} ${count === 1 ? "piece is" : "pieces are"} filed here. Move them first.`
              : "Delete this category"
          }
          className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-1.5 text-sm text-destructive transition-colors hover:bg-destructive/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          Delete
        </button>
      </div>
    </Card>
  );
}

function CategoryForm({
  editing,
  categories,
  onDone,
  onCancel,
}: {
  editing: Editing;
  categories: AdminCategory[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const row = editing.mode === "edit" ? editing.row : null;
  const [failure, setFailure] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: row ? categoryToForm(row) : blankCategoryForm(),
  });

  const imageKey = watch("imageKey");
  const name = watch("name");

  /*
   * Only a top-level category can be a parent, and a category cannot parent
   * itself. The database refuses a third level; this stops it being offered.
   */
  const parentOptions = categories.filter((c) => !c.parent_slug && c.slug !== row?.slug);

  // Editing a category that already has children must not push it under another.
  const hasChildren = categories.some((c) => c.parent_slug === row?.slug);

  async function onPickImage(file: File | undefined) {
    if (!file) return;
    setFailure(null);
    setUploading(true);
    try {
      const path = await uploadCategoryImage(file, watch("slug") || name || "category");
      setValue("imageKey", path, { shouldValidate: true });
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "Could not upload that image.");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(values: CategoryFormValues) {
    setFailure(null);
    try {
      await saveCategory(values, row?.slug);
      onDone();
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "Could not save.");
    }
  }

  return (
    <>
      <PageHeading
        title={row ? row.name : "New category"}
        hint={row ? `/collections/${row.slug}` : "It appears in the Collections menu once saved."}
      >
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </PageHeading>

      {failure ? <Banner tone="error">{failure}</Banner> : null}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-6">
        <fieldset className="rounded-xl border border-gold/25 bg-card p-6 shadow-[var(--shadow-soft)]">
          <legend className="px-2 font-display text-lg text-primary">Details</legend>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="cat-name">Name</Label>
              <Input
                id="cat-name"
                className="mt-1.5"
                {...register("name")}
                onChange={(e) => {
                  register("name").onChange(e);
                  // Only ever fills a blank slug on a new category, and never
                  // touches an existing one — see the note on the field below.
                  if (!row && !watch("slug")) {
                    setValue(
                      "slug",
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-+|-+$/g, ""),
                    );
                  }
                }}
              />
              <FieldError message={errors.name?.message} />
            </div>

            <div>
              <Label htmlFor="cat-slug">Web address</Label>
              <Input id="cat-slug" className="mt-1.5" disabled={!!row} {...register("slug")} />
              <p className="mt-1 text-xs leading-relaxed text-warmgrey">
                {row
                  ? "Fixed once created. Every piece filed here points at it, and changing it would strand them."
                  : "Becomes /collections/… — lowercase letters, numbers and hyphens."}
              </p>
              <FieldError message={errors.slug?.message} />
            </div>

            <div>
              <Label htmlFor="cat-parent">Sits under</Label>
              <Select
                id="cat-parent"
                className="mt-1.5"
                disabled={hasChildren}
                {...register("parentSlug")}
              >
                <option value="">Nothing — a top-level category</option>
                {parentOptions.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-xs leading-relaxed text-warmgrey">
                {hasChildren
                  ? "This one has sub-categories of its own, so it has to stay top-level — categories nest one level only."
                  : "A sub-category still shows on its parent's page, alongside the parent's other kinds."}
              </p>
              <FieldError message={errors.parentSlug?.message} />
            </div>

            <div>
              <Label htmlFor="cat-order">Order</Label>
              <Input
                id="cat-order"
                type="number"
                className="nums mt-1.5"
                {...register("sortOrder")}
              />
              <p className="mt-1 text-xs leading-relaxed text-warmgrey">
                Lowest first, within its own level.
              </p>
              <FieldError message={errors.sortOrder?.message} />
            </div>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-gold/25 bg-card p-6 shadow-[var(--shadow-soft)]">
          <legend className="px-2 font-display text-lg text-primary">Image</legend>
          <p className="mb-5 max-w-2xl text-xs leading-relaxed text-warmgrey">
            Shown on the home page tiles and at the top of the collection. A tall photograph suits
            the tile, which is a 3:4 crop.
          </p>

          <div className="flex flex-wrap items-center gap-5">
            <img
              src={imageFor(imageKey)}
              alt=""
              aria-hidden="true"
              className="h-32 w-24 rounded-lg object-cover"
            />
            <div>
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="hidden"
                onChange={(e) => void onPickImage(e.target.files?.[0])}
              />
              <Button
                type="button"
                variant="outline"
                disabled={uploading}
                onClick={() => fileInput.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ImageIcon className="h-4 w-4" aria-hidden="true" />
                )}
                {uploading ? "Uploading…" : "Choose a photograph"}
              </Button>
              <p className="nums mt-2 max-w-xs truncate text-xs text-warmgrey" title={imageKey}>
                {imageKey}
              </p>
              <FieldError message={errors.imageKey?.message} />
            </div>
          </div>
        </fieldset>

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting || uploading}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {row ? "Save changes" : "Create category"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </>
  );
}
