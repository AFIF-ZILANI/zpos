import { useState } from "react";
import { Store, Bell, Shield, CreditCard, Printer, Globe, ChevronRight, Save, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const sections = [
  { id: "store", label: "Store Info", icon: Store },
  { id: "account", label: "Account", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "payment", label: "Payment", icon: CreditCard },
  { id: "receipt", label: "Receipt & Print", icon: Printer },
  { id: "regional", label: "Regional", icon: Globe },
  { id: "security", label: "Security", icon: Shield },
];

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border last:border-0">
      <div className="flex-1 min-w-0 mr-6">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export default function Settings() {
  const [activeSection, setActiveSection] = useState("store");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your store preferences</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-52 shrink-0">
          <nav className="space-y-1">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  activeSection === s.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <s.icon className="w-4 h-4 shrink-0" />
                {s.label}
                {activeSection === s.id && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-4">
          {activeSection === "store" && (
            <Card className="border border-border">
              <CardHeader>
                <CardTitle className="text-base">Store Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Store Name</Label>
                    <Input defaultValue="ShopPOS Retail" className="mt-1" />
                  </div>
                  <div>
                    <Label>Store ID</Label>
                    <Input defaultValue="STORE-001" className="mt-1" disabled />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input defaultValue="+1 (555) 123-4567" className="mt-1" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input defaultValue="info@shoppos.com" className="mt-1" />
                  </div>
                  <div className="col-span-2">
                    <Label>Address</Label>
                    <Input defaultValue="123 Commerce St, New York, NY 10001" className="mt-1" />
                  </div>
                  <div>
                    <Label>Website</Label>
                    <Input defaultValue="https://shoppos.com" className="mt-1" />
                  </div>
                  <div>
                    <Label>Tax ID</Label>
                    <Input defaultValue="XX-XXXXXXX" className="mt-1" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === "account" && (
            <Card className="border border-border">
              <CardHeader>
                <CardTitle className="text-base">Account Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl">
                  <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center text-white text-xl font-bold">A</div>
                  <div>
                    <p className="font-semibold">Admin User</p>
                    <p className="text-sm text-muted-foreground">admin@shoppos.com</p>
                    <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded font-medium mt-1 inline-block">Owner</span>
                  </div>
                  <Button variant="outline" size="sm" className="ml-auto">Change Photo</Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>First Name</Label>
                    <Input defaultValue="Admin" className="mt-1" />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input defaultValue="User" className="mt-1" />
                  </div>
                  <div className="col-span-2">
                    <Label>Email Address</Label>
                    <Input defaultValue="admin@shoppos.com" className="mt-1" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === "notifications" && (
            <Card className="border border-border">
              <CardHeader>
                <CardTitle className="text-base">Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent>
                <SettingRow label="New Order Alerts" description="Get notified when a new order is placed">
                  <Switch defaultChecked />
                </SettingRow>
                <SettingRow label="Low Stock Alerts" description="Alert when product stock falls below threshold">
                  <Switch defaultChecked />
                </SettingRow>
                <SettingRow label="Daily Sales Report" description="Receive a daily summary of sales performance">
                  <Switch defaultChecked />
                </SettingRow>
                <SettingRow label="Customer Reviews" description="Notifications for new customer feedback">
                  <Switch />
                </SettingRow>
                <SettingRow label="Payment Failures" description="Immediate alerts for failed transactions">
                  <Switch defaultChecked />
                </SettingRow>
                <SettingRow label="System Updates" description="Updates about new features and maintenance">
                  <Switch />
                </SettingRow>
              </CardContent>
            </Card>
          )}

          {activeSection === "payment" && (
            <Card className="border border-border">
              <CardHeader>
                <CardTitle className="text-base">Payment Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <SettingRow label="Accept Cash" description="Allow cash payments at checkout">
                  <Switch defaultChecked />
                </SettingRow>
                <SettingRow label="Accept Cards" description="Allow credit/debit card payments">
                  <Switch defaultChecked />
                </SettingRow>
                <SettingRow label="Digital Wallets" description="Accept Apple Pay, Google Pay, etc.">
                  <Switch defaultChecked />
                </SettingRow>
                <SettingRow label="Tax Rate (%)" description="Default sales tax applied to all orders">
                  <Input defaultValue="8" type="number" className="w-20 h-8 text-sm text-right" />
                </SettingRow>
                <SettingRow label="Tip Options" description="Enable tipping at checkout">
                  <Switch />
                </SettingRow>
                <SettingRow label="Receipt via Email" description="Send digital receipts automatically">
                  <Switch defaultChecked />
                </SettingRow>
              </CardContent>
            </Card>
          )}

          {activeSection === "receipt" && (
            <Card className="border border-border">
              <CardHeader>
                <CardTitle className="text-base">Receipt & Print Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <SettingRow label="Auto-Print Receipts" description="Automatically print receipts after each sale">
                  <Switch defaultChecked />
                </SettingRow>
                <SettingRow label="Print Logo" description="Include store logo on printed receipts">
                  <Switch defaultChecked />
                </SettingRow>
                <SettingRow label="Paper Size" description="Default paper size for printing">
                  <Select defaultValue="80mm">
                    <SelectTrigger className="w-28 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="80mm">80mm</SelectItem>
                      <SelectItem value="58mm">58mm</SelectItem>
                      <SelectItem value="a4">A4</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingRow>
                <SettingRow label="Footer Message" description="Custom message printed at the bottom">
                  <Input defaultValue="Thank you for shopping!" className="w-48 h-8 text-sm" />
                </SettingRow>
              </CardContent>
            </Card>
          )}

          {activeSection === "regional" && (
            <Card className="border border-border">
              <CardHeader>
                <CardTitle className="text-base">Regional Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <SettingRow label="Currency" description="Currency used for all transactions">
                  <Select defaultValue="usd">
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usd">USD ($)</SelectItem>
                      <SelectItem value="eur">EUR (€)</SelectItem>
                      <SelectItem value="gbp">GBP (£)</SelectItem>
                      <SelectItem value="jpy">JPY (¥)</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingRow>
                <SettingRow label="Language" description="Display language for the interface">
                  <Select defaultValue="en">
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="de">Deutsch</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingRow>
                <SettingRow label="Timezone" description="Store operating timezone">
                  <Select defaultValue="et">
                    <SelectTrigger className="w-40 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="et">Eastern (ET)</SelectItem>
                      <SelectItem value="ct">Central (CT)</SelectItem>
                      <SelectItem value="mt">Mountain (MT)</SelectItem>
                      <SelectItem value="pt">Pacific (PT)</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingRow>
                <SettingRow label="Date Format" description="How dates are displayed">
                  <Select defaultValue="mdy">
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                      <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                      <SelectItem value="ymd">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingRow>
              </CardContent>
            </Card>
          )}

          {activeSection === "security" && (
            <Card className="border border-border">
              <CardHeader>
                <CardTitle className="text-base">Security Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <SettingRow label="Two-Factor Authentication" description="Add an extra layer of account security">
                  <Switch />
                </SettingRow>
                <SettingRow label="Session Timeout" description="Automatically log out after inactivity">
                  <Select defaultValue="30">
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingRow>
                <SettingRow label="Require PIN for Refunds" description="Require manager PIN before processing refunds">
                  <Switch defaultChecked />
                </SettingRow>
                <SettingRow label="Audit Log" description="Keep a detailed log of all actions">
                  <Switch defaultChecked />
                </SettingRow>
                <div className="pt-4">
                  <Label>Change Password</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <Input type="password" placeholder="Current password" />
                    <Input type="password" placeholder="New password" />
                    <Input type="password" placeholder="Confirm new password" className="col-span-2" />
                  </div>
                  <Button variant="outline" size="sm" className="mt-3">Update Password</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-end gap-3">
            <Button variant="outline">Discard</Button>
            <Button onClick={handleSave} className="min-w-28">
              {saved ? (
                <>✓ Saved!</>
              ) : (
                <><Save className="w-4 h-4 mr-2" />Save Changes</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
