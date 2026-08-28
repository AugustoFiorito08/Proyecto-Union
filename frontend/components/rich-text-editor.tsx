"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Image as ImageIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

/**
 * `<RichTextEditor />` (SPEC.md §7.2): "párrafo, negrita, cursiva, listas,
 * alineación, link, imagen — usado en el wizard de Comunicaciones". Librería
 * elegida: Tiptap (`@tiptap/react` + `@tiptap/starter-kit` +
 * `@tiptap/extension-link`/`extension-image`/`extension-text-align`) — es el
 * editor rich-text más estándar del ecosistema React/Next, headless (se
 * integra con los estilos de Tailwind del proyecto sin traer su propio CSS de
 * terceros) y con soporte oficial de React 19 en su v3. No había ninguna
 * librería de rich-text instalada (`package.json` verificado antes de
 * agregar la dependencia).
 *
 * Componente controlado: `value`/`onChange` son la fuente de verdad del HTML,
 * igual que un `<textarea>` controlado — el `useEffect` solo resincroniza el
 * editor cuando `value` cambia por fuera (ej. al cargar un borrador
 * existente), nunca en cada tecleo.
 *
 * LIMITACIÓN DOCUMENTADA: SPEC.md §5 no lista ningún endpoint de upload de
 * imágenes sueltas para Comunicaciones (a diferencia de
 * `POST /api/comunicaciones/{id}/adjuntos`, que es para adjuntos del email,
 * no para imágenes embebidas en el cuerpo). El botón de imagen pide una URL
 * directa en vez de subir un archivo — si Etapa 4 agrega un endpoint de
 * upload genérico, reemplazar este input por un `<input type="file">` real.
 */
export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [showImageInput, setShowImageInput] = useState(false);
  const [imageUrl, setImageUrl] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true }),
      Image,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          "rte-content min-h-40 rounded-b-md border border-t-0 border-input bg-transparent px-3 py-2 text-sm",
          "focus:outline-none"
        ),
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Resincroniza cuando `value` cambia desde afuera (ej. al abrir el wizard
  // en modo edición con un borrador ya cargado) sin pisar la posición del
  // cursor mientras el usuario tipea (por eso el chequeo `!== getHTML()`).
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="min-h-48 rounded-md border border-input bg-muted/20" aria-hidden="true" />
    );
  }

  function toggleLink() {
    if (editor!.isActive("link")) {
      editor!.chain().focus().unsetLink().run();
      return;
    }
    setShowImageInput(false);
    setShowLinkInput((prev) => !prev);
  }

  function applyLink() {
    if (linkUrl.trim()) {
      editor!.chain().focus().extendMarkRange("link").setLink({ href: linkUrl.trim() }).run();
    }
    setLinkUrl("");
    setShowLinkInput(false);
  }

  function toggleImageInput() {
    setShowLinkInput(false);
    setShowImageInput((prev) => !prev);
  }

  function applyImage() {
    if (imageUrl.trim()) {
      editor!.chain().focus().setImage({ src: imageUrl.trim() }).run();
    }
    setImageUrl("");
    setShowImageInput(false);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 rounded-t-md border border-input bg-muted/40 p-1.5">
        <ToolbarButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          label="Negrita"
        >
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          label="Cursiva"
        >
          <Italic className="size-4" />
        </ToolbarButton>

        <ToolbarSeparator />

        <ToolbarButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          label="Lista"
        >
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          label="Lista numerada"
        >
          <ListOrdered className="size-4" />
        </ToolbarButton>

        <ToolbarSeparator />

        <ToolbarButton
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          label="Alinear a la izquierda"
        >
          <AlignLeft className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          label="Centrar"
        >
          <AlignCenter className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          label="Alinear a la derecha"
        >
          <AlignRight className="size-4" />
        </ToolbarButton>

        <ToolbarSeparator />

        <ToolbarButton active={editor.isActive("link")} onClick={toggleLink} label="Insertar link">
          <LinkIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton active={showImageInput} onClick={toggleImageInput} label="Insertar imagen">
          <ImageIcon className="size-4" />
        </ToolbarButton>
      </div>

      {showLinkInput ? (
        <div className="flex items-center gap-2 border-x border-input bg-muted/20 p-1.5">
          <Input
            autoFocus
            placeholder="https://..."
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyLink();
              }
            }}
            className="h-7 flex-1 text-xs"
          />
          <Button type="button" size="sm" className="h-7" onClick={applyLink}>
            Aplicar
          </Button>
        </div>
      ) : null}

      {showImageInput ? (
        <div className="flex items-center gap-2 border-x border-input bg-muted/20 p-1.5">
          <Input
            autoFocus
            placeholder="URL de la imagen (https://...)"
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyImage();
              }
            }}
            className="h-7 flex-1 text-xs"
          />
          <Button type="button" size="sm" className="h-7" onClick={applyImage}>
            Insertar
          </Button>
        </div>
      ) : null}

      <EditorContent editor={editor} placeholder={placeholder} />
    </div>
  );
}

function ToolbarSeparator() {
  return <div className="mx-0.5 h-5 w-px bg-border" aria-hidden="true" />;
}

interface ToolbarButtonProps {
  active?: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}

function ToolbarButton({ active, onClick, label, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
      className={cn(
        "flex size-7 items-center justify-center rounded-md text-foreground/70 transition-colors hover:bg-accent hover:text-accent-foreground",
        active && "bg-accent text-accent-foreground"
      )}
    >
      {children}
    </button>
  );
}
