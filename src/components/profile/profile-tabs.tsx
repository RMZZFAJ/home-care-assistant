"use client";

import { Tabs } from "@base-ui/react/tabs";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/primitives";
import { SettingsSectionCards } from "@/components/forms/settings-section";
import "./profile-tabs.css";

const sections: { id: string; label: string; icon: IconName }[] = [
  { id: "identity", label: "Meu perfil", icon: "users" },
  { id: "security", label: "Segurança", icon: "shield" },
  { id: "notices", label: "Avisos e aplicativo", icon: "bell" },
  { id: "devices", label: "Dispositivos", icon: "phone" },
  { id: "help", label: "Ajuda", icon: "help" },
];

/** Keep every form and official recovery mounted while navigating the account. */
export function ProfileTabs({ children }: { children: Record<string, ReactNode> }) {
  const params = useSearchParams();
  const requested = params.get("profileTab");
  const value = requested && sections.some(section => section.id === requested)
    ? requested
    : params.get("mfa") === "required" ? "security" : "identity";
  return (
    <SettingsSectionCards>
      <Tabs.Root value={value} onValueChange={next => {
        if (typeof next !== "string" || !sections.some(section => section.id === next)) return;
        const url = new URL(window.location.href);
        url.searchParams.set("profileTab", next);
        window.history.pushState(null, "", url.pathname + url.search + url.hash);
      }}>
        <Tabs.List aria-label="Seções do perfil" className="hca-document-tab-list">
          {sections.map(section => (
            <Tabs.Tab key={section.id} value={section.id} className="hca-document-tab">
              <Icon name={section.icon} />{section.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        {sections.map(section => (
          <Tabs.Panel key={section.id} value={section.id} keepMounted className="hca-profile-panel">
            {children[section.id]}
          </Tabs.Panel>
        ))}
      </Tabs.Root>
    </SettingsSectionCards>
  );
}
