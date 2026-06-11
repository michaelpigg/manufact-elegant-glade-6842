import { McpUseProvider, useWidget, useWidgetTheme, useCallTool, ModelContext, type WidgetMetadata } from "mcp-use/react";
import { useState, useEffect } from "react";
import { z } from "zod";

const propsSchema = z.object({
  item: z.object({
    id: z.string(),
    name: z.string(),
    basePrice: z.number(),
    description: z.string(),
  }),
  widgetId: z.string().optional(),
});

type Props = z.infer<typeof propsSchema>;

export const widgetMetadata: WidgetMetadata = {
  description: "Customize a beverage with size, milk, temperature, and more",
  props: propsSchema,
  exposeAsTool: false,
};

export default function DrinkCustomizer() {
  const { props, isPending } = useWidget<Props>();
  const theme = useWidgetTheme();
  const { callTool: addToCart, isPending: isAdding } = useCallTool("add-to-cart");
  const { callTool: checkStatus } = useCallTool("check-widget-status");

  const [size, setSize] = useState<"small" | "medium" | "large">("medium");
  const [milk, setMilk] = useState<"whole" | "skim" | "oat" | "almond" | "soy" | "coconut">("whole");
  const [temperature, setTemperature] = useState<"hot" | "cold" | "iced">("hot");
  const [shots, setShots] = useState(2);
  const [extraHot, setExtraHot] = useState(false);
  const [noFoam, setNoFoam] = useState(false);
  const [whippedCream, setWhippedCream] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isActive, setIsActive] = useState(true);

  // Polling loop for active widget check
  useEffect(() => {
    const wId = props.widgetId;
    if (isPending || !wId) return;

    const interval = setInterval(() => {
      checkStatus(
        { widgetId: wId },
        {
          onSuccess: (result) => {
            const data = result.structuredContent as {
              isActive?: boolean;
            } | null;
            if (data && data.isActive === false) {
              setIsActive(false);
              clearInterval(interval);
            }
          },
          onError: (err) => {
            console.warn("Failed to check drink-customizer status:", err);
          },
        }
      );
    }, 4000);

    return () => clearInterval(interval);
  }, [isPending, props.widgetId]);

  const historicalBanner = !isActive && (
    <div
      style={{
        padding: "10px 16px",
        backgroundColor: theme === "dark" ? "rgba(217, 119, 6, 0.2)" : "rgba(251, 191, 36, 0.2)",
        borderBottom: `1px solid ${theme === "dark" ? "rgba(217, 119, 6, 0.4)" : "rgba(251, 191, 36, 0.4)"}`,
        color: theme === "dark" ? "#f59e0b" : "#d97706",
        fontSize: 13,
        fontWeight: 600,
        textAlign: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        zIndex: 20,
      }}
    >
      <span>🕒 Historical View — The conversation has continued</span>
    </div>
  );

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
          Loading customizer...
        </div>
      </McpUseProvider>
    );
  }

  const colors = {
    bg: theme === "dark" ? "#1e1e1e" : "#ffffff",
    text: theme === "dark" ? "#e0e0e0" : "#1a1a1a",
    secondary: theme === "dark" ? "#b0b0b0" : "#666",
    border: theme === "dark" ? "#404040" : "#e0e0e0",
    hover: theme === "dark" ? "#2a2a2a" : "#f5f5f5",
    primary: theme === "dark" ? "#4a9eff" : "#0066cc",
  };

  // Calculate total price
  const sizeAdd = size === "large" ? 0.5 : size === "small" ? -0.25 : 0;
  const customizationCost =
    (shots > 2 ? (shots - 2) * 0.75 : 0) + (whippedCream ? 0.75 : 0);
  const totalPrice = (props.item.basePrice + sizeAdd + customizationCost) * quantity;

  const handleAddToCart = () => {
    addToCart({
      itemId: props.item.id,
      quantity,
      customizations: {
        size,
        milk,
        temperature,
        shots,
        extraHot,
        noFoam,
        whippedCream,
      },
    });
  };

  const OptionGroup = ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <div style={{ marginBottom: 20 }}>
      <label
        style={{
          display: "block",
          fontWeight: 600,
          marginBottom: 8,
          fontSize: 14,
          color: colors.text,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );

  const ButtonGroup = ({
    options,
    value,
    onChange,
  }: {
    options: { label: string; value: any }[];
    value: any;
    onChange: (value: any) => void;
  }) => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          style={{
            padding: "8px 12px",
            border: `1px solid ${value === option.value ? colors.primary : colors.border}`,
            borderRadius: 4,
            backgroundColor: value === option.value ? colors.primary : "transparent",
            color: value === option.value ? "white" : colors.text,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: value === option.value ? 600 : 400,
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );

  const Checkbox = ({
    label,
    checked,
    onChange,
  }: {
    label: string;
    checked: boolean;
    onChange: (value: boolean) => void;
  }) => (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        cursor: "pointer",
        marginBottom: 8,
        fontSize: 14,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ cursor: "pointer" }}
      />
      {label}
    </label>
  );

  return (
    <McpUseProvider autoSize>
      <ModelContext content={`User is customizing ${props.item.name} (base price: $${props.item.basePrice.toFixed(2)})`}>
        {historicalBanner}
        <div
          style={{
            padding: 20,
            backgroundColor: colors.bg,
            color: colors.text,
            pointerEvents: isActive ? "auto" : "none",
            opacity: isActive ? 1 : 0.6,
          }}
        >
        {/* Header */}
        <h1 style={{ margin: "0 0 8px 0", fontSize: 24 }}>
          ☕ Customize {props.item.name}
        </h1>
        <p style={{ margin: "0 0 20px 0", fontSize: 13, color: colors.secondary }}>
          {props.item.description}
        </p>

        {/* Customization options */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
            marginBottom: 24,
          }}
        >
          {/* Left column */}
          <div>
            <OptionGroup label="Size">
              <ButtonGroup
                options={[
                  { label: "Small (-$0.25)", value: "small" },
                  { label: "Medium", value: "medium" },
                  { label: "Large (+$0.50)", value: "large" },
                ]}
                value={size}
                onChange={setSize}
              />
            </OptionGroup>

            <OptionGroup label="Milk">
              <ButtonGroup
                options={[
                  { label: "Whole", value: "whole" },
                  { label: "Skim", value: "skim" },
                  { label: "Oat", value: "oat" },
                  { label: "Almond", value: "almond" },
                  { label: "Soy", value: "soy" },
                  { label: "Coconut", value: "coconut" },
                ]}
                value={milk}
                onChange={setMilk}
              />
            </OptionGroup>

            <OptionGroup label="Temperature">
              <ButtonGroup
                options={[
                  { label: "Hot", value: "hot" },
                  { label: "Cold", value: "cold" },
                  { label: "Iced", value: "iced" },
                ]}
                value={temperature}
                onChange={setTemperature}
              />
            </OptionGroup>
          </div>

          {/* Right column */}
          <div>
            <OptionGroup label="Espresso Shots">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  onClick={() => setShots(Math.max(1, shots - 1))}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 4,
                    border: `1px solid ${colors.border}`,
                    backgroundColor: "transparent",
                    cursor: "pointer",
                    fontSize: 16,
                  }}
                >
                  −
                </button>
                <span
                  style={{
                    minWidth: 40,
                    textAlign: "center",
                    fontSize: 16,
                    fontWeight: 600,
                  }}
                >
                  {shots}
                </span>
                <button
                  onClick={() => setShots(Math.min(5, shots + 1))}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 4,
                    border: `1px solid ${colors.border}`,
                    backgroundColor: "transparent",
                    cursor: "pointer",
                    fontSize: 16,
                  }}
                >
                  +
                </button>
                {shots > 2 && (
                  <span style={{ fontSize: 12, color: colors.secondary }}>
                    +${((shots - 2) * 0.75).toFixed(2)}
                  </span>
                )}
              </div>
            </OptionGroup>

            <OptionGroup label="Add-ons">
              <Checkbox
                label="Extra Hot"
                checked={extraHot}
                onChange={setExtraHot}
              />
              <Checkbox
                label="No Foam"
                checked={noFoam}
                onChange={setNoFoam}
              />
              <Checkbox
                label="Whipped Cream (+$0.75)"
                checked={whippedCream}
                onChange={setWhippedCream}
              />
            </OptionGroup>

            <OptionGroup label="Quantity">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 4,
                    border: `1px solid ${colors.border}`,
                    backgroundColor: "transparent",
                    cursor: "pointer",
                    fontSize: 16,
                  }}
                >
                  −
                </button>
                <span
                  style={{
                    minWidth: 40,
                    textAlign: "center",
                    fontSize: 16,
                    fontWeight: 600,
                  }}
                >
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(Math.min(10, quantity + 1))}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 4,
                    border: `1px solid ${colors.border}`,
                    backgroundColor: "transparent",
                    cursor: "pointer",
                    fontSize: 16,
                  }}
                >
                  +
                </button>
              </div>
            </OptionGroup>
          </div>
        </div>

        {/* Summary and button */}
        <div
          style={{
            padding: 16,
            backgroundColor: colors.hover,
            borderRadius: 8,
            marginBottom: 16,
            border: `1px solid ${colors.border}`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 14 }}>Base Price:</span>
            <span>${props.item.basePrice.toFixed(2)}</span>
          </div>
          {sizeAdd !== 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 13, color: colors.secondary }}>
              <span>Size Adjustment:</span>
              <span>${sizeAdd.toFixed(2)}</span>
            </div>
          )}
          {customizationCost > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 13, color: colors.secondary }}>
              <span>Customizations:</span>
              <span>${customizationCost.toFixed(2)}</span>
            </div>
          )}
          <div
            style={{
              borderTop: `1px solid ${colors.border}`,
              paddingTop: 12,
              display: "flex",
              justifyContent: "space-between",
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            <span>Total ({quantity}x):</span>
            <span style={{ color: colors.primary }}>${totalPrice.toFixed(2)}</span>
          </div>
        </div>

        {/* Add to Cart button */}
        <button
          onClick={handleAddToCart}
          disabled={isAdding}
          style={{
            width: "100%",
            padding: 12,
            backgroundColor: colors.primary,
            color: "white",
            border: "none",
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            cursor: isAdding ? "not-allowed" : "pointer",
            opacity: isAdding ? 0.7 : 1,
          }}
        >
          {isAdding ? "Adding to Cart..." : "Add to Cart"}
        </button>
        </div>
      </ModelContext>
    </McpUseProvider>
  );
}
