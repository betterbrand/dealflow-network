import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Settings as SettingsIcon, Save, RotateCcw, Zap, ChevronDown, ChevronUp, RefreshCw, Loader2 } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  // User settings state
  const [model, setModel] = useState("auto");
  const [maxTokens, setMaxTokens] = useState(16384);
  const [temperature, setTemperature] = useState(0.7);
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [useDefaults, setUseDefaults] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [testStatus, setTestStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Admin settings state (for system defaults)
  const [adminModel, setAdminModel] = useState("auto");
  const [adminMaxTokens, setAdminMaxTokens] = useState(16384);
  const [adminTemperature, setAdminTemperature] = useState(0.7);
  const [adminApiUrl, setAdminApiUrl] = useState("");

  // Fetch effective settings
  const { data: effectiveSettings } = trpc.settings.getEffectiveSettings.useQuery();
  const { data: userSettings } = trpc.settings.getUserSettings.useQuery();
  const { data: systemSettings } = trpc.settings.getSystemSettings.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  // Fetch available models
  const { data: availableModels = [] } = trpc.settings.getAvailableModels.useQuery({ provider: "mor-org" });

  // Update mutations
  const updateUserMutation = trpc.settings.updateUserSetting.useMutation({
    onSuccess: () => {
      utils.settings.getEffectiveSettings.invalidate();
      utils.settings.getUserSettings.invalidate();
      toast.success("Settings saved successfully");
    },
    onError: (error) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });

  const updateSystemMutation = trpc.settings.updateSystemSetting.useMutation({
    onSuccess: () => {
      utils.settings.getSystemSettings.invalidate();
      utils.settings.getEffectiveSettings.invalidate();
      toast.success("System defaults updated");
    },
    onError: (error) => {
      toast.error(`Failed to update system defaults: ${error.message}`);
    },
  });

  const deleteMutation = trpc.settings.deleteUserSetting.useMutation({
    onSuccess: () => {
      utils.settings.getEffectiveSettings.invalidate();
      utils.settings.getUserSettings.invalidate();
      toast.success("Reverted to system defaults");
    },
  });

  const testConnectionMutation = trpc.settings.testLLMConnection.useMutation();

  const refreshModelsMutation = trpc.settings.refreshModels.useMutation({
    onSuccess: () => {
      utils.settings.getAvailableModels.invalidate();
      toast.success("Models refreshed from mor.org");
    },
    onError: (error) => {
      toast.error(`Failed to refresh models: ${error.message}`);
    },
  });

  // Model options: Auto-select + dynamic mor.org models
  const modelOptions = [
    { value: "auto", label: "Auto-Select (Recommended)", description: "mor.org automatically selects the best model" },
    ...availableModels.map(m => ({
      value: m.modelId,
      label: m.displayName,
      description: m.description || `${m.contextWindow?.toLocaleString()} tokens`,
    })),
  ];

  // Load settings when data arrives
  useEffect(() => {
    if (effectiveSettings) {
      setModel(effectiveSettings.llm_default_model || "auto");
      setMaxTokens(effectiveSettings.llm_default_max_tokens || 16384);
      setTemperature(effectiveSettings.llm_default_temperature || 0.7);
      setApiUrl(effectiveSettings.llm_default_api_url || "");
    }

    // Check if user has any overrides
    if (userSettings && userSettings.length > 0) {
      setUseDefaults(false);
    } else {
      setUseDefaults(true);
    }
  }, [effectiveSettings, userSettings]);

  // Load admin settings
  useEffect(() => {
    if (systemSettings) {
      const modelSetting = systemSettings.find((s) => s.key === "llm_default_model");
      const tokensSetting = systemSettings.find((s) => s.key === "llm_default_max_tokens");
      const tempSetting = systemSettings.find((s) => s.key === "llm_default_temperature");
      const urlSetting = systemSettings.find((s) => s.key === "llm_default_api_url");

      if (modelSetting) setAdminModel(JSON.parse(modelSetting.value));
      if (tokensSetting) setAdminMaxTokens(JSON.parse(tokensSetting.value));
      if (tempSetting) setAdminTemperature(JSON.parse(tempSetting.value));
      if (urlSetting) setAdminApiUrl(JSON.parse(urlSetting.value));
    }
  }, [systemSettings]);

  const handleSaveUserSettings = async () => {
    try {
      if (useDefaults) {
        // Delete all user overrides
        await deleteMutation.mutateAsync({ key: "llm_default_model" });
        await deleteMutation.mutateAsync({ key: "llm_default_max_tokens" });
        await deleteMutation.mutateAsync({ key: "llm_default_temperature" });
        await deleteMutation.mutateAsync({ key: "llm_default_api_url" });
        if (apiKey) {
          await deleteMutation.mutateAsync({ key: "llm_user_api_key" });
        }
      } else {
        // Save user overrides
        await updateUserMutation.mutateAsync({
          key: "llm_default_model",
          value: JSON.stringify(model),
        });
        await updateUserMutation.mutateAsync({
          key: "llm_default_max_tokens",
          value: JSON.stringify(maxTokens),
        });
        await updateUserMutation.mutateAsync({
          key: "llm_default_temperature",
          value: JSON.stringify(temperature),
        });
        if (apiUrl) {
          await updateUserMutation.mutateAsync({
            key: "llm_default_api_url",
            value: JSON.stringify(apiUrl),
          });
        }
        if (apiKey) {
          await updateUserMutation.mutateAsync({
            key: "llm_user_api_key",
            value: JSON.stringify(apiKey),
          });
        }
      }
    } catch (error) {
      // Error already handled by mutation
    }
  };

  const handleSaveSystemSettings = async () => {
    try {
      await updateSystemMutation.mutateAsync({
        key: "llm_default_model",
        value: JSON.stringify(adminModel),
      });
      await updateSystemMutation.mutateAsync({
        key: "llm_default_max_tokens",
        value: JSON.stringify(adminMaxTokens),
      });
      await updateSystemMutation.mutateAsync({
        key: "llm_default_temperature",
        value: JSON.stringify(adminTemperature),
      });
      await updateSystemMutation.mutateAsync({
        key: "llm_default_api_url",
        value: JSON.stringify(adminApiUrl),
      });
    } catch (error) {
      // Error already handled by mutation
    }
  };

  const handleTestConnection = async () => {
    setTestStatus(null);
    const result = await testConnectionMutation.mutateAsync({
      model: useDefaults ? adminModel : model,
      apiUrl: useDefaults ? adminApiUrl : apiUrl,
      apiKey: apiKey || undefined,
    });

    if (result.success) {
      setTestStatus({
        success: true,
        message: `Connection successful! Model: ${result.model}`,
      });
    } else {
      setTestStatus({
        success: false,
        message: `Connection failed: ${result.error}`,
      });
    }
  };

  const handleReset = () => {
    if (effectiveSettings) {
      setModel(effectiveSettings.llm_default_model || "gpt-4o-mini");
      setMaxTokens(effectiveSettings.llm_default_max_tokens || 16384);
      setTemperature(effectiveSettings.llm_default_temperature || 0.7);
      setApiUrl(effectiveSettings.llm_default_api_url || "");
      setApiKey("");
      setUseDefaults(userSettings?.length === 0);
      toast.info("Settings reset to current saved values");
    }
  };

  const handleAdminReset = () => {
    if (systemSettings) {
      const modelSetting = systemSettings.find((s) => s.key === "llm_default_model");
      const tokensSetting = systemSettings.find((s) => s.key === "llm_default_max_tokens");
      const tempSetting = systemSettings.find((s) => s.key === "llm_default_temperature");
      const urlSetting = systemSettings.find((s) => s.key === "llm_default_api_url");

      if (modelSetting) setAdminModel(JSON.parse(modelSetting.value));
      if (tokensSetting) setAdminMaxTokens(JSON.parse(tokensSetting.value));
      if (tempSetting) setAdminTemperature(JSON.parse(tempSetting.value));
      if (urlSetting) setAdminApiUrl(JSON.parse(urlSetting.value));
      toast.info("System defaults reset to current saved values");
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Configure your LLM preferences and defaults</p>
        </div>
      </div>

      <Tabs defaultValue="user" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="user">My Settings</TabsTrigger>
          {user?.role === "admin" && (
            <TabsTrigger value="admin">System Defaults (Admin)</TabsTrigger>
          )}
        </TabsList>

        {/* User Settings Tab */}
        <TabsContent value="user" className="space-y-6">
          <div className="bg-card border rounded-lg p-6 space-y-6">
            {/* Use System Defaults Toggle */}
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Use System Defaults</Label>
                <p className="text-sm text-muted-foreground">
                  Use the organization's default LLM settings
                </p>
              </div>
              <Switch checked={useDefaults} onCheckedChange={setUseDefaults} />
            </div>

            {/* LLM Configuration */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="model">LLM Model</Label>
                <Select value={model} onValueChange={setModel} disabled={useDefaults}>
                  <SelectTrigger id="model">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {modelOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex flex-col">
                          <span className="font-medium">{option.label}</span>
                          {option.description && (
                            <span className="text-xs text-muted-foreground">{option.description}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground mt-1">
                  Provider: mor.org {effectiveSettings?.llm_fallback_provider && `→ ${effectiveSettings.llm_fallback_provider} fallback`}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="maxTokens">Max Tokens</Label>
                  <span className="text-sm font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                    {maxTokens.toLocaleString()}
                  </span>
                </div>
                <Slider
                  id="maxTokens"
                  min={1000}
                  max={32768}
                  step={1000}
                  value={[maxTokens]}
                  onValueChange={([val]) => setMaxTokens(val)}
                  disabled={useDefaults}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="temperature">Temperature</Label>
                  <span className="text-sm font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                    {temperature.toFixed(1)}
                  </span>
                </div>
                <Slider
                  id="temperature"
                  min={0}
                  max={1}
                  step={0.1}
                  value={[temperature]}
                  onValueChange={([val]) => setTemperature(val)}
                  disabled={useDefaults}
                />
                <p className="text-xs text-muted-foreground">
                  Higher values make output more creative, lower values more focused
                </p>
              </div>

              {/* Advanced Settings */}
              <div className="border-t pt-4">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  Advanced Settings
                </button>

                {showAdvanced && (
                  <div className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="apiUrl">Custom API URL</Label>
                      <Input
                        id="apiUrl"
                        type="url"
                        placeholder="https://api.example.com/v1/chat/completions"
                        value={apiUrl}
                        onChange={(e) => setApiUrl(e.target.value)}
                        disabled={useDefaults}
                      />
                      <p className="text-xs text-muted-foreground">
                        Optional. Leave empty to use the default endpoint.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="apiKey">Custom API Key</Label>
                      <Input
                        id="apiKey"
                        type="password"
                        placeholder="sk-..."
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        disabled={useDefaults}
                      />
                      <p className="text-xs text-muted-foreground">
                        Optional. Use your own API key instead of the system key.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Test Connection */}
            {testStatus && (
              <Alert variant={testStatus.success ? "default" : "destructive"}>
                <AlertDescription>{testStatus.message}</AlertDescription>
              </Alert>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t">
              <Button onClick={handleSaveUserSettings} disabled={updateUserMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </Button>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={testConnectionMutation.isPending}
              >
                <Zap className="h-4 w-4 mr-2" />
                Test Connection
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Admin Settings Tab */}
        {user?.role === "admin" && (
          <TabsContent value="admin" className="space-y-6">
            <div className="bg-card border rounded-lg p-6 space-y-6">
              <Alert>
                <AlertDescription>
                  These settings apply to all users by default. Users can override these with their own preferences.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="adminModel">Default LLM Model</Label>
                  <Select value={adminModel} onValueChange={setAdminModel}>
                    <SelectTrigger id="adminModel">
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {modelOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex flex-col">
                            <span className="font-medium">{option.label}</span>
                            {option.description && (
                              <span className="text-xs text-muted-foreground">{option.description}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="adminMaxTokens">Default Max Tokens</Label>
                    <span className="text-sm font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                      {adminMaxTokens.toLocaleString()}
                    </span>
                  </div>
                  <Slider
                    id="adminMaxTokens"
                    min={1000}
                    max={32768}
                    step={1000}
                    value={[adminMaxTokens]}
                    onValueChange={([val]) => setAdminMaxTokens(val)}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="adminTemperature">Default Temperature</Label>
                    <span className="text-sm font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                      {adminTemperature.toFixed(1)}
                    </span>
                  </div>
                  <Slider
                    id="adminTemperature"
                    min={0}
                    max={1}
                    step={0.1}
                    value={[adminTemperature]}
                    onValueChange={([val]) => setAdminTemperature(val)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminApiUrl">Default API URL</Label>
                  <Input
                    id="adminApiUrl"
                    type="url"
                    placeholder="https://api.example.com/v1/chat/completions"
                    value={adminApiUrl}
                    onChange={(e) => setAdminApiUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to use the default OpenAI-compatible endpoint.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t">
                <Button onClick={handleSaveSystemSettings} disabled={updateSystemMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Save System Defaults
                </Button>
                <Button variant="outline" onClick={handleAdminReset}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button
                  variant="outline"
                  onClick={() => refreshModelsMutation.mutate()}
                  disabled={refreshModelsMutation.isPending}
                >
                  {refreshModelsMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh Models from mor.org
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
