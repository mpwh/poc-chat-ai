import { Link } from "wouter";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sidebar as SidebarPrimitive,
  SidebarHeader,
  SidebarContent,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { FileText, MessageSquare, Plus } from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <SidebarPrimitive className="border-r">
        <SidebarHeader className="px-4 py-2">
          <h1 className="text-xl font-bold">DocChat AI</h1>
        </SidebarHeader>
        <SidebarContent>
          <ScrollArea className="h-[calc(100vh-5rem)]">
            <div className="px-4 py-2">
              <Link href="/">
                <Button variant="ghost" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Documents
                </Button>
              </Link>
              <Button variant="ghost" className="w-full justify-start">
                <MessageSquare className="mr-2 h-4 w-4" />
                Chats
              </Button>
              <Button className="w-full mt-4">
                <Plus className="mr-2 h-4 w-4" />
                New Document
              </Button>
            </div>
          </ScrollArea>
        </SidebarContent>
      </SidebarPrimitive>
      <main className="flex-1 overflow-auto bg-background">
        {children}
      </main>
    </div>
  );
}
