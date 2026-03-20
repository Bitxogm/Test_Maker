"use client";

import * as React from "react";
import { History, Settings, Terminal, FlaskConical, Zap, Code2 } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";

const data = {
  navMain: [
    {
      title: "Editor",
      url: "#",
      icon: Code2,
      isActive: true,
    },
    {
      title: "Tests",
      url: "#",
      icon: FlaskConical,
    },
    {
      title: "Terminal",
      url: "#",
      icon: Terminal,
    },
    {
      title: "Historial",
      url: "#",
      icon: History,
    },
  ],
  secondary: [
    {
      title: "Ajustes",
      url: "#",
      icon: Settings,
    },
    {
      title: "API Status",
      url: "#",
      icon: Zap,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      variant="sidebar"
      collapsible="icon"
      className="border-r border-dark-700 bg-dark-900"
      {...props}
    >
      <SidebarHeader className="h-14 border-b border-dark-700 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-neon-cyan flex items-center justify-center shadow-[0_0_15px_rgba(0,255,245,0.4)]">
            <FlaskConical className="w-5 h-5 text-black" />
          </div>
          <span className="font-black tracking-tighter text-white hidden group-data-[state=expanded]:block">
            TEST<span className="text-neon-cyan">LAB</span>
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">
            Pestañas
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {data.navMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={item.isActive}
                    tooltip={item.title}
                    className="hover:bg-neon-cyan/10 hover:text-neon-cyan transition-all"
                    render={
                      <a href={item.url} className="flex items-center gap-3 px-4 py-3">
                        <item.icon
                          className={`w-5 h-5 ${item.isActive ? "text-neon-cyan" : "text-gray-400"}`}
                        />
                        <span className="font-semibold">{item.title}</span>
                      </a>
                    }
                  />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">
            Sistema
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {data.secondary.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    tooltip={item.title}
                    className="hover:bg-neon-purple/10 hover:text-neon-purple transition-all"
                    render={
                      <a href={item.url} className="flex items-center gap-3 px-4 py-3">
                        <item.icon className="w-5 h-5 text-gray-400" />
                        <span className="font-semibold">{item.title}</span>
                      </a>
                    }
                  />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-dark-700 bg-dark-800/50">
        <div className="flex items-center gap-3 group-data-[state=collapsed]:justify-center">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-neon-purple to-neon-cyan p-[2px]">
            <div className="w-full h-full rounded-full bg-dark-900 flex items-center justify-center">
              <span className="text-[10px] font-bold">JD</span>
            </div>
          </div>
          <div className="flex flex-col group-data-[state=collapsed]:hidden">
            <span className="text-xs font-bold text-white">John Doe</span>
            <span className="text-[9px] text-gray-500 uppercase font-black">Free Tier</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
