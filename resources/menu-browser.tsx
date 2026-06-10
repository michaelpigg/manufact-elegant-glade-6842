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

type CustomizingItem = {
  id: string;
  name: string;
  basePrice: number;
  description: string;
};

export const widgetMetadata: WidgetMetadata = {
  description: "Browse MCPBeans menu with details and customization options",
  props: propsSchema,
  exposeAsTool: false,
};

type CustomizationValue = boolean | number | string | undefined;

type CartItem = {
  id: string;
  name: string;
  quantity: number;
  price: number;
  customizations?: Record<string, CustomizationValue>;
};

export default function MenuBrowser() {
  const { props, isPending } = useWidget<Props>();
  const theme = useWidgetTheme();
  const { callTool: addToCart, isPending: isAdding } = useCallTool("add-to-cart");
  const { callTool: checkout, isPending: isCheckingOut } = useCallTool("checkout");

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [customizingItem, setCustomizingItem] = useState<CustomizingItem | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [viewingCart, setViewingCart] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Customization state
  const [size, setSize] = useState<"small" | "medium" | "large">("medium");
  const [milk, setMilk] = useState<"whole" | "skim" | "oat" | "almond" | "soy" | "coconut">("whole");
  const [temperature, setTemperature] = useState<"hot" | "cold" | "iced">("hot");
  const [shots, setShots] = useState(2);
  const [extraHot, setExtraHot] = useState(false);
  const [noFoam, setNoFoam] = useState(false);
  const [whippedCream, setWhippedCream] = useState(false);
  const [quantity, setQuantity] = useState(1);

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

  const handleCustomize = (item: Props["items"][number]) => {
    setCustomizingItem({
      id: item.id,
      name: item.name,
      basePrice: item.price,
      description: item.description,
    });
    setSize("medium");
    setMilk("whole");
    setTemperature("hot");
    setShots(2);
    setExtraHot(false);
    setNoFoam(false);
    setWhippedCream(false);
    setQuantity(1);
  };

  const addItemToLocalCart = (itemId: string, qty: number, unitPrice: number, customizations?: Record<string, CustomizationValue>) => {
    const menuItem = props.items.find((i) => i.id === itemId);
    if (!menuItem) return;
    setCartItems((prev) => {
      const existing = prev.find(
        (i) => i.id === itemId && JSON.stringify(i.customizations) === JSON.stringify(customizations)
      );
      if (existing) {
        return prev.map((i) =>
          i === existing ? { ...i, quantity: i.quantity + qty } : i
        );
      }
      return [...prev, { id: itemId, name: menuItem.name, quantity: qty, price: unitPrice, customizations }];
    });
  };

  const handleQuickAdd = async (itemId: string) => {
    const newAdding = new Set(addingIds);
    newAdding.add(itemId);
    setAddingIds(newAdding);

    const menuItem = props.items.find((i) => i.id === itemId);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      addToCart({ itemId, quantity: 1 }, {
        onSuccess: () => addItemToLocalCart(itemId, 1, menuItem?.price ?? 0),
      });
    } finally {
      newAdding.delete(itemId);
      setAddingIds(newAdding);
    }
  };

  const cartBadge = cartCount > 0 && (
    <button
      onClick={() => setViewingCart(true)}
      style={{
        position: "absolute",
        top: 16,
        right: 16,
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 14px",
        backgroundColor: colors.primary,
        color: "white",
        border: "none",
        borderRadius: 20,
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 600,
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        zIndex: 10,
      }}
    >
      🛒 {cartCount} {cartCount === 1 ? "item" : "items"} →
    </button>
  );

  // Inline cart view
  if (viewingCart) {
    const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = total * 0.08;
    const finalTotal = total + tax;

    const handleRemoveItem = (id: string, customizations?: Record<string, CustomizationValue>) => {
      setCartItems((prev) =>
        prev.filter((i) => !(i.id === id && JSON.stringify(i.customizations) === JSON.stringify(customizations)))
      );
    };

    const handleUpdateQuantity = (id: string, customizations: Record<string, CustomizationValue> | undefined, qty: number) => {
      if (qty <= 0) {
        handleRemoveItem(id, customizations);
        return;
      }
      setCartItems((prev) =>
        prev.map((i) =>
          i.id === id && JSON.stringify(i.customizations) === JSON.stringify(customizations)
            ? { ...i, quantity: qty }
            : i
        )
      );
    };

    const handleCheckout = () => {
      checkout({}, {
        onSuccess: () => {
          setCartItems([]);
          setOrderPlaced(true);
        },
      });
    };

    return (
      <McpUseProvider autoSize>
        <div style={{ padding: 20, backgroundColor: colors.bg, color: colors.text }}>
          {orderPlaced ? (
            <div style={{ padding: 40, textAlign: "center", color: colors.secondary }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <h3 style={{ fontSize: 18, margin: "0 0 8px 0", color: colors.text }}>Order submitted!</h3>
              <p style={{ fontSize: 14, margin: "0 0 20px 0" }}>Your coffee is on its way. Thank you!</p>
              <button
                onClick={() => { setOrderPlaced(false); setViewingCart(false); }}
                style={{ padding: "10px 20px", backgroundColor: colors.primary, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}
              >
                Back to Menu
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setViewingCart(false)}
                style={{ marginBottom: 16, padding: "6px 12px", backgroundColor: "transparent", color: colors.primary, border: `1px solid ${colors.primary}`, borderRadius: 4, cursor: "pointer", fontSize: 13 }}
              >
                ← Back to Menu
              </button>
              <h1 style={{ margin: "0 0 16px 0", fontSize: 24 }}>🛒 Shopping Cart</h1>

              {cartItems.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: colors.secondary }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
                  <h3 style={{ fontSize: 18, margin: "0 0 8px 0" }}>Your cart is empty</h3>
                  <p style={{ fontSize: 14, margin: 0 }}>Start adding items from the menu!</p>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 20 }}>
                    {cartItems.map((item) => {
                      const c = item.customizations ?? {};
                      const badges: string[] = [];
                      if (c.size) badges.push(c.size as string);
                      if (c.milk) badges.push(`${c.milk as string} milk`);
                      if (c.temperature) badges.push(c.temperature as string);
                      if (typeof c.shots === "number" && c.shots !== 2) badges.push(`${c.shots} shots`);
                      if (c.whippedCream) badges.push("whipped cream");
                      const itemKey = `${item.id}-${JSON.stringify(item.customizations)}`;
                      return (
                      <div
                        key={itemKey}
                        style={{ padding: 16, marginBottom: 12, border: `1px solid ${colors.border}`, borderRadius: 8, backgroundColor: colors.hover }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                          <div style={{ flex: 1 }}>
                            <h3 style={{ margin: "0 0 4px 0", fontSize: 16, fontWeight: 600 }}>{item.name}</h3>
                            <p style={{ margin: 0, fontSize: 14, color: colors.secondary }}>${item.price.toFixed(2)} each</p>
                            {badges.length > 0 && (
                                <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
                                  {badges.map((b) => (
                                    <span key={b} style={{ fontSize: 11, padding: "2px 6px", backgroundColor: colors.bg, borderRadius: 3, color: colors.secondary, border: `1px solid ${colors.border}` }}>{b}</span>
                                  ))}
                                </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveItem(item.id, item.customizations)}
                            style={{ padding: "4px 8px", backgroundColor: "transparent", color: colors.secondary, border: `1px solid ${colors.border}`, borderRadius: 4, cursor: "pointer", fontSize: 12 }}
                          >
                            Remove
                          </button>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: `1px solid ${colors.border}` }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <button onClick={() => handleUpdateQuantity(item.id, item.customizations, item.quantity - 1)} style={{ width: 28, height: 28, borderRadius: 4, border: `1px solid ${colors.border}`, backgroundColor: "transparent", cursor: "pointer" }}>−</button>
                            <span style={{ minWidth: 30, textAlign: "center", fontWeight: 600 }}>{item.quantity}</span>
                            <button onClick={() => handleUpdateQuantity(item.id, item.customizations, item.quantity + 1)} style={{ width: 28, height: 28, borderRadius: 4, border: `1px solid ${colors.border}`, backgroundColor: "transparent", cursor: "pointer" }}>+</button>
                          </div>
                          <span style={{ fontWeight: 600, color: colors.primary }}>${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      </div>
                      );
                    })}
                  </div>

                  <div style={{ padding: 16, backgroundColor: colors.hover, borderRadius: 8, border: `1px solid ${colors.border}`, marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14 }}>
                      <span>Subtotal:</span><span>${total.toFixed(2)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 14, color: colors.secondary }}>
                      <span>Tax (8%):</span><span>${tax.toFixed(2)}</span>
                    </div>
                    <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 12, display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 600 }}>
                      <span>Total:</span><span style={{ color: colors.primary }}>${finalTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => setCartItems([])}
                      style={{ flex: 1, padding: 12, backgroundColor: "transparent", color: colors.primary, border: `1px solid ${colors.primary}`, borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                    >
                      Clear Cart
                    </button>
                    <button
                      onClick={handleCheckout}
                      disabled={isCheckingOut}
                      style={{ flex: 1, padding: 12, backgroundColor: colors.primary, color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: isCheckingOut ? "not-allowed" : "pointer", opacity: isCheckingOut ? 0.7 : 1 }}
                    >
                      {isCheckingOut ? "Placing order..." : "Checkout"}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </McpUseProvider>
    );
  }

  // Inline customizer view
  if (customizingItem) {
    const sizeAdd = size === "large" ? 0.5 : size === "small" ? -0.25 : 0;
    const customizationCost =
      (shots > 2 ? (shots - 2) * 0.75 : 0) + (whippedCream ? 0.75 : 0);
    const totalPrice = (customizingItem.basePrice + sizeAdd + customizationCost) * quantity;

    const handleAddToCart = () => {
      const customizations = { size, milk, temperature, shots, extraHot, noFoam, whippedCream };
      addToCart({
        itemId: customizingItem.id,
        quantity,
        customizations,
      }, {
        onSuccess: () => {
          addItemToLocalCart(customizingItem.id, quantity, (customizingItem.basePrice + sizeAdd + customizationCost), customizations);
          setCustomizingItem(null);
        },
      });
    };

    const ButtonGroup = ({
      options,
      value,
      onChange,
    }: {
      options: { label: string; value: string }[];
      value: string;
      onChange: (value: string) => void;
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

    return (
      <McpUseProvider autoSize>
        <div style={{ position: "relative", padding: 20, backgroundColor: colors.bg, color: colors.text }}>
          {cartBadge}
          {/* Back button */}
          <button
            onClick={() => setCustomizingItem(null)}
            style={{
              marginBottom: 16,
              padding: "6px 12px",
              backgroundColor: "transparent",
              color: colors.primary,
              border: `1px solid ${colors.primary}`,
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            ← Back to Menu
          </button>

          <h1 style={{ margin: "0 0 8px 0", fontSize: 24 }}>
            ☕ Customize {customizingItem.name}
          </h1>
          <p style={{ margin: "0 0 20px 0", fontSize: 13, color: colors.secondary }}>
            {customizingItem.description}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
            {/* Left column */}
            <div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Size</label>
                <ButtonGroup
                  options={[
                    { label: "Small (-$0.25)", value: "small" },
                    { label: "Medium", value: "medium" },
                    { label: "Large (+$0.50)", value: "large" },
                  ]}
                  value={size}
                  onChange={(v) => setSize(v as typeof size)}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Milk</label>
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
                  onChange={(v) => setMilk(v as typeof milk)}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Temperature</label>
                <ButtonGroup
                  options={[
                    { label: "Hot", value: "hot" },
                    { label: "Cold", value: "cold" },
                    { label: "Iced", value: "iced" },
                  ]}
                  value={temperature}
                  onChange={(v) => setTemperature(v as typeof temperature)}
                />
              </div>
            </div>

            {/* Right column */}
            <div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Espresso Shots</label>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button
                    onClick={() => setShots(Math.max(1, shots - 1))}
                    style={{ width: 32, height: 32, borderRadius: 4, border: `1px solid ${colors.border}`, backgroundColor: "transparent", cursor: "pointer", fontSize: 16 }}
                  >−</button>
                  <span style={{ minWidth: 40, textAlign: "center", fontSize: 16, fontWeight: 600 }}>{shots}</span>
                  <button
                    onClick={() => setShots(Math.min(5, shots + 1))}
                    style={{ width: 32, height: 32, borderRadius: 4, border: `1px solid ${colors.border}`, backgroundColor: "transparent", cursor: "pointer", fontSize: 16 }}
                  >+</button>
                  {shots > 2 && (
                    <span style={{ fontSize: 12, color: colors.secondary }}>+${((shots - 2) * 0.75).toFixed(2)}</span>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Add-ons</label>
                {([
                  { label: "Extra Hot", checked: extraHot, onChange: setExtraHot },
                  { label: "No Foam", checked: noFoam, onChange: setNoFoam },
                  { label: "Whipped Cream (+$0.75)", checked: whippedCream, onChange: setWhippedCream },
                ] as const).map(({ label, checked, onChange }) => (
                  <label key={label} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 8, fontSize: 14 }}>
                    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ cursor: "pointer" }} />
                    {label}
                  </label>
                ))}
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Quantity</label>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    style={{ width: 32, height: 32, borderRadius: 4, border: `1px solid ${colors.border}`, backgroundColor: "transparent", cursor: "pointer", fontSize: 16 }}
                  >−</button>
                  <span style={{ minWidth: 40, textAlign: "center", fontSize: 16, fontWeight: 600 }}>{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(10, quantity + 1))}
                    style={{ width: 32, height: 32, borderRadius: 4, border: `1px solid ${colors.border}`, backgroundColor: "transparent", cursor: "pointer", fontSize: 16 }}
                  >+</button>
                </div>
              </div>
            </div>
          </div>

          {/* Price summary */}
          <div style={{ padding: 16, backgroundColor: colors.hover, borderRadius: 8, marginBottom: 16, border: `1px solid ${colors.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 14 }}>Base Price:</span>
              <span>${customizingItem.basePrice.toFixed(2)}</span>
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
            <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 12, display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 600 }}>
              <span>Total ({quantity}x):</span>
              <span style={{ color: colors.primary }}>${totalPrice.toFixed(2)}</span>
            </div>
          </div>

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
      </McpUseProvider>
    );
  }

  const categories = [...new Set(props.items.map((item) => item.category))].sort();

  return (
    <McpUseProvider autoSize>
      <div
        style={{
          position: "relative",
          padding: 20,
          backgroundColor: colors.bg,
          color: colors.text,
        }}
      >
        {cartBadge}
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
                  const isItemAdding = addingIds.has(item.id);

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
                              handleCustomize(item);
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
                          disabled={isItemAdding}
                          style={{
                            flex: item.type === "food" ? 1 : 0.6,
                            padding: "8px 12px",
                            backgroundColor: isItemAdding ? colors.secondary : "transparent",
                            color: colors.primary,
                            border: `1px solid ${colors.primary}`,
                            borderRadius: 4,
                            cursor: isItemAdding ? "not-allowed" : "pointer",
                            fontSize: 12,
                            fontWeight: 500,
                          }}
                        >
                          {isItemAdding ? "Adding..." : "Add"}
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
