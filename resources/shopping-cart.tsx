import { McpUseProvider, useWidget, useWidgetTheme, useCallTool, type WidgetMetadata } from "mcp-use/react";
import { useState, useEffect } from "react";
import { z } from "zod";

const propsSchema = z.object({
  cartItems: z.array(z.any()).optional(),
});

type Props = z.infer<typeof propsSchema>;

interface CartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  customizations?: Record<string, any>;
}

export const widgetMetadata: WidgetMetadata = {
  description: "Shopping cart for MCPBeans orders",
  props: propsSchema,
  exposeAsTool: false,
};

export default function ShoppingCart() {
  const { props, isPending, state, setState } = useWidget<Props>();
  const theme = useWidgetTheme();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const { callTool: checkout, isPending: isCheckingOut } = useCallTool("checkout");

  // Initialize cart from state or props
  useEffect(() => {
    if (!isPending) {
      const savedCart = (state as any)?.cartItems || props.cartItems || [];
      setCartItems(savedCart);
    }
  }, [isPending, state, props]);

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
          Loading cart...
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
    danger: theme === "dark" ? "#ff6b6b" : "#dc3545",
  };

  const calculateTotal = () => {
    return cartItems.reduce((sum: number, item: CartItem) => sum + item.price * item.quantity, 0);
  };

  const handleRemoveItem = (id: string) => {
    const updated = cartItems.filter((item: CartItem) => item.id !== id);
    setCartItems(updated);
    setState({ cartItems: updated });
  };

  const handleUpdateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(id);
      return;
    }
    const updated = cartItems.map((item: CartItem) =>
      item.id === id ? { ...item, quantity } : item
    );
    setCartItems(updated);
    setState({ cartItems: updated });
  };

  const handleClearCart = () => {
    setCartItems([]);
    setState({ cartItems: [] });
  };

  const handleCheckout = () => {
    checkout({}, {
      onSuccess: () => {
        setCartItems([]);
        setState({ cartItems: [] });
        setOrderPlaced(true);
      },
    });
  };

  const total = calculateTotal();
  const tax = total * 0.08;
  const finalTotal = total + tax;

  const CustomizationBadge = ({ customizations }: { customizations?: Record<string, any> }) => {
    if (!customizations || Object.keys(customizations).length === 0) {
      return null;
    }

    const badges = [];
    if (customizations.size) badges.push(customizations.size);
    if (customizations.milk) badges.push(`${customizations.milk} milk`);
    if (customizations.temperature) badges.push(customizations.temperature);
    if (customizations.shots) badges.push(`${customizations.shots} shots`);
    if (customizations.whippedCream) badges.push("whipped cream");

    return (
      <div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
        {badges.map((badge, i) => (
          <span
            key={i}
            style={{
              fontSize: 11,
              padding: "2px 6px",
              backgroundColor: colors.hover,
              borderRadius: 3,
              color: colors.secondary,
              border: `1px solid ${colors.border}`,
            }}
          >
            {badge}
          </span>
        ))}
      </div>
    );
  };

  return (
    <McpUseProvider autoSize>
      <div
        style={{
          padding: 20,
          backgroundColor: colors.bg,
          color: colors.text,
        }}
      >
        <h1 style={{ margin: "0 0 8px 0", fontSize: 24 }}>🛒 Shopping Cart</h1>

        {orderPlaced ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: colors.secondary,
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h3 style={{ fontSize: 18, margin: "0 0 8px 0", color: colors.text }}>
              Order submitted!
            </h3>
            <p style={{ fontSize: 14, margin: 0 }}>
              Your coffee is on its way. Thank you for your purchase!
            </p>
          </div>
        ) : cartItems.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: colors.secondary,
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <h3 style={{ fontSize: 18, margin: "0 0 8px 0" }}>
              Your cart is empty
            </h3>
            <p style={{ fontSize: 14, margin: 0 }}>
              Start adding items from the menu!
            </p>
          </div>
        ) : (
          <>
            {/* Cart items */}
            <div style={{ marginBottom: 20 }}>
              {cartItems.map((item: CartItem) => (
                <div
                  key={item.id}
                  style={{
                    padding: 16,
                    marginBottom: 12,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 8,
                    backgroundColor: colors.hover,
                  }}
                >
                  {/* Item header */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "start",
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: "0 0 4px 0", fontSize: 16, fontWeight: 600 }}>
                        {item.name}
                      </h3>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 14,
                          color: colors.secondary,
                        }}
                      >
                        ${item.price.toFixed(2)} each
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      style={{
                        padding: "4px 8px",
                        backgroundColor: "transparent",
                        color: colors.danger,
                        border: `1px solid ${colors.danger}`,
                        borderRadius: 4,
                        cursor: "pointer",
                        fontSize: 12,
                      }}
                    >
                      Remove
                    </button>
                  </div>

                  {/* Customizations */}
                  {item.customizations && (
                    <CustomizationBadge customizations={item.customizations} />
                  )}

                  {/* Quantity and subtotal */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: `1px solid ${colors.border}`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button
                        onClick={() =>
                          handleUpdateQuantity(item.id, item.quantity - 1)
                        }
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 4,
                          border: `1px solid ${colors.border}`,
                          backgroundColor: "transparent",
                          cursor: "pointer",
                          fontSize: 14,
                        }}
                      >
                        −
                      </button>
                      <span
                        style={{
                          minWidth: 30,
                          textAlign: "center",
                          fontWeight: 600,
                        }}
                      >
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          handleUpdateQuantity(item.id, item.quantity + 1)
                        }
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 4,
                          border: `1px solid ${colors.border}`,
                          backgroundColor: "transparent",
                          cursor: "pointer",
                          fontSize: 14,
                        }}
                      >
                        +
                      </button>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: colors.primary,
                        }}
                      >
                        ${(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div
              style={{
                padding: 16,
                backgroundColor: colors.hover,
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                  fontSize: 14,
                }}
              >
                <span>Subtotal:</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 12,
                  fontSize: 14,
                  color: colors.secondary,
                }}
              >
                <span>Tax (8%):</span>
                <span>${tax.toFixed(2)}</span>
              </div>
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
                <span>Total:</span>
                <span style={{ color: colors.primary }}>
                  ${finalTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleClearCart}
                style={{
                  flex: 1,
                  padding: 12,
                  backgroundColor: "transparent",
                  color: colors.primary,
                  border: `1px solid ${colors.primary}`,
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Clear Cart
              </button>
              <button
                onClick={handleCheckout}
                disabled={isCheckingOut}
                style={{
                  flex: 1,
                  padding: 12,
                  backgroundColor: colors.primary,
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: isCheckingOut ? "not-allowed" : "pointer",
                  opacity: isCheckingOut ? 0.7 : 1,
                }}
              >
                {isCheckingOut ? "Placing order..." : "Checkout"}
              </button>
            </div>
          </>
        )}
      </div>
    </McpUseProvider>
  );
}
