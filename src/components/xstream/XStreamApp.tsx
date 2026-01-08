import { useState, useCallback, useEffect } from "react";
import { Column, Face, Theme, Layout, AppState } from "@/types/xstream";
import { XStreamColumn } from "./XStreamColumn";
import { ConstructionButton } from "./ConstructionButton";

const THEME_STORAGE_KEY = "xstream-theme";

// Sample data for demonstration
const createSampleColumn = (id: string, face: Face): Column => ({
  id,
  face,
  frame: "main-frame",
  character: face === "character" ? "Korven" : undefined,
  stateCode: "X0Y0Z0",
  solidBlocks: [
    {
      id: `${id}-solid-1`,
      title: "Opening Scene",
      content: "The morning light filtered through the dusty windows of the old shop. Grantification had been running this place for decades, but today felt different. Something in the air spoke of change, of new beginnings waiting just beyond the threshold.\n\nThe horses in the back stable stirred restlessly.",
      timestamp: Date.now() - 3600000,
    },
  ],
  liquidCards: [
    {
      id: `${id}-liquid-1`,
      userId: "user-1",
      userName: "Grantification",
      content: "Open the shop",
      timestamp: Date.now() - 1800000,
    },
    {
      id: `${id}-liquid-2`,
      userId: "user-2",
      userName: "Orly",
      content: "Wake up the horses",
      timestamp: Date.now() - 900000,
    },
  ],
  vapourEntries: [
    {
      id: `${id}-vapour-1`,
      userId: "user-1",
      userName: "Grantification",
      text: "Feed the horses",
      timestamp: Date.now() - 60000,
      isSelf: true,
    },
  ],
});

const getInitialState = (): AppState => ({
  theme: (localStorage.getItem(THEME_STORAGE_KEY) as Theme) || "dark",
  layout: "single",
  showPresence: true,
  showVapourOthers: true,
  showDirectory: true,
  columns: [createSampleColumn("col-1", "character")],
  presenceCount: 1,
});

export function XStreamApp() {
  const [state, setState] = useState<AppState>(getInitialState);
  const [input, setInput] = useState("");
  const [isQuerying, setIsQuerying] = useState(false);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, state.theme);
  }, [state.theme]);

  const handleFaceChange = useCallback((columnId: string, face: Face) => {
    setState((prev) => ({
      ...prev,
      columns: prev.columns.map((col) =>
        col.id === columnId ? { ...col, face } : col
      ),
    }));
  }, []);

  const handleVapourSubmit = useCallback((columnId: string, text: string) => {
    setState((prev) => ({
      ...prev,
      columns: prev.columns.map((col) =>
        col.id === columnId
          ? {
              ...col,
              vapourEntries: [
                ...col.vapourEntries,
                {
                  id: `vapour-${Date.now()}`,
                  userId: "self",
                  userName: "You",
                  text,
                  timestamp: Date.now(),
                  isSelf: true,
                },
              ],
            }
          : col
      ),
    }));
  }, []);

  const handleThemeChange = useCallback((theme: Theme) => {
    setState((prev) => ({ ...prev, theme }));
  }, []);

  const handleShowVapourOthersChange = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, showVapourOthers: value }));
  }, []);

  const handleShowDirectoryChange = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, showDirectory: value }));
  }, []);

  const handleBackgroundChange = useCallback((columnId: string, background: string) => {
    setState((prev) => ({
      ...prev,
      columns: prev.columns.map((col) =>
        col.id === columnId ? { ...col, background } : col
      ),
    }));
  }, []);

  const handleLogout = useCallback(() => {
    console.log("Logout clicked");
  }, []);

  // Input handlers for ConstructionButton
  const handleQuery = useCallback((text: string) => {
    console.log("[XStreamApp] Query:", text);
    setIsQuerying(true);
    // Simulate query delay
    setTimeout(() => {
      setIsQuerying(false);
    }, 1000);
  }, []);

  const handleSubmit = useCallback((text: string) => {
    console.log("[XStreamApp] Submit to liquid:", text);
    // Add to first column's liquid
    if (state.columns.length > 0) {
      setState((prev) => ({
        ...prev,
        columns: prev.columns.map((col, index) =>
          index === 0
            ? {
                ...col,
                liquidCards: [
                  ...col.liquidCards,
                  {
                    id: `liquid-${Date.now()}`,
                    userId: "self",
                    userName: "You",
                    content: text,
                    timestamp: Date.now(),
                  },
                ],
              }
            : col
        ),
      }));
    }
  }, [state.columns.length]);

  return (
    <div
      className="app h-screen w-full overflow-hidden"
      data-theme={state.theme}
      data-layout={state.layout}
      data-show-presence={state.showPresence}
      data-show-vapour-others={state.showVapourOthers}
      data-show-directory={state.showDirectory}
    >
      {/* Columns container */}
      <div className="columns-container h-full grid">
        {state.columns.map((column) => (
          <XStreamColumn
            key={column.id}
            column={column}
            presenceCount={state.presenceCount}
            showVapourOthers={state.showVapourOthers}
            showDirectory={state.showDirectory}
            onFaceChange={handleFaceChange}
            onVapourSubmit={handleVapourSubmit}
            onShowVapourOthersChange={handleShowVapourOthersChange}
            onShowDirectoryChange={handleShowDirectoryChange}
            onBackgroundChange={handleBackgroundChange}
          />
        ))}
      </div>

      {/* Floating construction button */}
      <ConstructionButton
        onThemeChange={handleThemeChange}
        onLogout={handleLogout}
        currentTheme={state.theme}
        value={input}
        onChange={setInput}
        onQuery={handleQuery}
        onSubmit={handleSubmit}
        isQuerying={isQuerying}
        placeholder="Type your thought..."
      />
    </div>
  );
}
