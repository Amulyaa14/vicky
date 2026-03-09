import { Bell, Home, HelpCircle, Settings, Shield, Mail, User, FileText, Lock } from "lucide-react";
import { ExpandableTabs, type TabItem } from "@/components/ui/expandable-tabs";

export default function ExpandableTabsDemo() {
    const defaultTabs: TabItem[] = [
        { title: "Dashboard", icon: Home },
        { title: "Notifications", icon: Bell },
        { type: "separator" },
        { title: "Settings", icon: Settings },
        { title: "Support", icon: HelpCircle },
        { title: "Security", icon: Shield },
    ];

    const customTabs: TabItem[] = [
        { title: "Profile", icon: User },
        { title: "Messages", icon: Mail },
        { type: "separator" },
        { title: "Documents", icon: FileText },
        { title: "Privacy", icon: Lock },
    ];

    return (
        <div className="container mx-auto p-8 space-y-12">
            <div className="space-y-4">
                <h1 className="text-3xl font-bold">Expandable Tabs Demo</h1>
                <p className="text-muted-foreground">
                    A customizable, animated tab bar component using Framer Motion and Lucide Icons.
                </p>
            </div>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold">Default Styling</h2>
                <div className="p-6 border rounded-xl bg-card">
                    <ExpandableTabs tabs={defaultTabs} />
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold">Custom Color & Border</h2>
                <div className="p-6 border rounded-xl bg-card">
                    <ExpandableTabs
                        tabs={customTabs}
                        activeColor="text-blue-500"
                        className="border-blue-200 dark:border-blue-800"
                    />
                </div>
            </section>
        </div>
    );
}
