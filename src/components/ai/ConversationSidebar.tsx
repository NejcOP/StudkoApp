import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { sl } from "date-fns/locale";
import DeleteConfirmDialog from "./DeleteConfirmDialog";

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ConversationSidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onDeleteAllConversations?: () => void;
  isLoading?: boolean;
}

export const ConversationSidebar = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onDeleteAllConversations,
  isLoading
}: ConversationSidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConversationToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (conversationToDelete) {
      setIsDeleting(true);
      await onDeleteConversation(conversationToDelete);
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setConversationToDelete(null);
    }
  };

  const handleConfirmDeleteAll = async () => {
    if (onDeleteAllConversations) {
      setIsDeleting(true);
      await onDeleteAllConversations();
      setIsDeleting(false);
      setDeleteAllDialogOpen(false);
    }
  };

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center py-4 px-2 bg-white/90 dark:bg-slate-800/90 rounded-2xl border border-border shadow-lg">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(false)}
          className="mb-4"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNewConversation}
          className="mb-2"
        >
          <Plus className="w-4 h-4" />
        </Button>
        <div className="flex flex-col gap-2 mt-2">
          {conversations.slice(0, 5).map((conv) => (
            <Button
              key={conv.id}
              variant={currentConversationId === conv.id ? "default" : "ghost"}
              size="icon"
              onClick={() => onSelectConversation(conv.id)}
              className="w-8 h-8"
            >
              <MessageSquare className="w-4 h-4" />
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-64 flex flex-col bg-white/90 dark:bg-slate-800/90 rounded-2xl border border-border shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-3 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Pogovori</h3>
          <div className="flex items-center gap-1">
            {conversations.length > 0 && onDeleteAllConversations && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteAllDialogOpen(true)}
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                title="Izbriši vse pogovore"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(true)}
              className="h-8 w-8"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* New Conversation Button */}
        <div className="p-3 border-b border-border">
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={onNewConversation}
          >
            <Plus className="w-4 h-4" />
            Nov pogovor
          </Button>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Ni pogovorov
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`group relative rounded-lg p-2 cursor-pointer transition-colors ${
                    currentConversationId === conv.id
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => onSelectConversation(conv.id)}
                >
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {conv.title}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Clock className="w-3 h-3" />
                        {format(new Date(conv.updated_at), "d. MMM", { locale: sl })}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={(e) => handleDeleteClick(e, conv.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Delete Single Conversation Dialog */}
      <DeleteConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setConversationToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Izbriši pogovor"
        description="Ali ste prepričani, da želite izbrisati ta pogovor? Tega dejanja ni mogoče razveljaviti."
        isLoading={isDeleting}
      />

      {/* Delete All Conversations Dialog */}
      <DeleteConfirmDialog
        isOpen={deleteAllDialogOpen}
        onClose={() => setDeleteAllDialogOpen(false)}
        onConfirm={handleConfirmDeleteAll}
        title="Izbriši vse pogovore"
        description={`Ali ste prepričani, da želite izbrisati vseh ${conversations.length} pogovorov? Tega dejanja ni mogoče razveljaviti.`}
        isLoading={isDeleting}
      />
    </>
  );
};

export default ConversationSidebar;
