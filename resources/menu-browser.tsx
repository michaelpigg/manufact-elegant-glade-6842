import { McpUseProvider, useWidget, useWidgetTheme, useCallTool, type WidgetMetadata } from "mcp-use/react";
import { useState } from "react";
import { z } from "zod";

const propsSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum(["beverage", "food"]),
      category: z.string(),
      description: z.string(),
      price: z.number(),
      icon: z.string(),
    })
  ),
  filter: z.enum(["all", "beverages", "food"]),
});

type Props = z.infer<typeof propsSchema>;

export const widgetMetadata: WidgetMetadata = {
  description: "Browse MCPBeans menu with details and customization options",
  props: propsSchema,
  exposeAsTool: false,
};

export default function MenuBrowser() {
  const { props, isPending } = useWidget<Props>();
  const theme = useWidgetTheme();
  const { callTool: customizeDrink } = useCallTool("customize-drink");
  const { callTool: addToCart } = useCallTool("add-to-cart");

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div
          style={{
            padding: 40,
            textAlign: "center",
            color: theme === "dark" ? "#999" : "#666",
          }}
        >
          Loading menu...
        </div>
      </McpUseProvider>
    );
  }

  const colors = {
    bg: theme === "dark" ? "#1e1e1e" : "#ffffff",
    text: theme === "dark" ? "#e0e0e0" : "#1a1a1a",
    border: theme === "dark" ? "#404040" : "#e0e0e0",
    hover: theme === "dark" ? "#2a2a2a" : "#f5f5f5",
    primary: theme === "dark" ? "#4a9eff" : "#0066cc",
    secondary: theme === "dark" ? "#6c757d" : "#6c757d",
  };

  const handleCustomize = (itemId: string) => {
    customizeDrink({ itemId });
  };

  const handleQuickAdd = async (itemId: string) => {
    const newAdding = new Set(addingIds);
    newAdding.add(itemId);
    setAddingIds(newAdding);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      addToCart({ itemId, quantity: 1 });
    } finally {
      newAdding.delete(itemId);
      setAddingIds(newAdding);
    }
  };

  const categories = [...new Set(props.items.map((item) => item.category))].sort();

  return (
    <McpUseProvider autoSize>
      <div
        style={{
          padding: 20,
          backgroundColor: colors.bg,
          color: colors.text,
        }}
      >
        <h1 style={{ margin: "0 0 8px 0", fontSize: 28 }}>☕ MCPBeans Menu</h1>
        <p
          style={{
            margin: "0 0 20px 0",
            fontSize: 14,
            color: colors.secondary,
          }}
        >
          Showing {props.items.length} items
        </p>

        {/* Category sections */}
        {categories.map((category) => {
          const categoryItems = props.items.filter(
            (item) => item.category === category
          );
          return (
            <div key={category} style={{ marginBottom: 24 }}>
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  margin: "0 0 12px 0",
                  color: colors.primary,
                }}
              >
                {category}
              </h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 12,
                }}
              >
                {categoryItems.map((item) => {
                  const isExpanded = expandedId === item.id;
                  const isAdding = addingIds.has(item.id);

                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: 16,
                        border: `1px solid ${colors.border}`,
                        borderRadius: 8,
                        backgroundColor: colors.bg,
                        cursor: "pointer",
                        transition: "background-color 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colors.hover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = colors.bg;
                      }}
                      onClick={() =>
                        setExpandedId(isExpanded ? null : item.id)
                      }
                    >
                      {/* Header */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "start",
                          gap: 12,
                          marginBottom: 8,
                        }}
                      >
                        <span style={{ fontSize: 28 }}>{item.icon}</span>
                        <div style={{ flex: 1 }}>
                          <h3
                            style={{
                              margin: 0,
                              fontSize: 16,
                              fontWeight: 600,
                            }}
                          >
                            {item.name}
                          </h3>
                          <p
                            style={{
                              margin: "4px 0 0 0",
                              fontSize: 14,
                              color: colors.secondary,
                            }}
                          >
                            ${item.price.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* Description */}
                      <p
                        style={{
                          margin: "8px 0",
                          fontSize: 13,
                          color: colors.secondary,
                          lineHeight: 1.4,
                        }}
                      >
                        {item.description}
                      </p>

                      {/* Actions */}
                      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        {item.type === "beverage" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCustomize(item.id);
                            }}
                            style={{
                              flex: 1,
                              padding: "8px 12px",
                              backgroundColor: colors.primary,
                              color: "white",
                              border: "none",
                              borderRadius: 4,
                              cursor: "pointer",
                              fontSize: 12,
                              fontWeight: 500,
                            }}
                          >
                            Customize
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickAdd(item.id);
                          }}
                          disabled={isAdding}
                          style={{
                            flex: item.type === "food" ? 1 : 0.6,
                            padding: "8px 12px",
                            backgroundColor: isAdding ? colors.secondary : "transparent",
                            color: colors.primary,
                            border: `1px solid ${colors.primary}`,
                            borderRadius: 4,
                            cursor: isAdding ? "not-allowed" : "pointer",
                            fontSize: 12,
                            fontWeight: 500,
                          }}
                        >
                          {isAdding ? "Adding..." : "Add"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </McpUseProvider>
  );
}
