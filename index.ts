import { MCPServer, text, object, widget, error } from "mcp-use/server";
import { z } from "zod";

// Create MCP server instance
const server = new MCPServer({
  name: "mcpbeans",
  title: "MCPBeans Coffee Shop",
  version: "1.0.0",
  description: "Order coffee and food from MCPBeans",
  baseUrl: process.env.MCP_URL || "http://localhost:3000",
  favicon: "favicon.ico",
  icons: [
    {
      src: "icon.svg",
      mimeType: "image/svg+xml",
      sizes: ["512x512"],
    },
  ],
});

// === CART STATE ===
interface CartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  customizations?: Record<string, unknown>;
}

// Map of conversationId/subject -> CartItem[]
const carts: Record<string, CartItem[]> = {};

// Map of conversationId/subject -> latest widgetId string
const latestWidgetIds: Record<string, string> = {};

// Map of conversationId/subject -> cartVersion number
const cartVersions: Record<string, number> = {};

function getCartKey(ctx: any): string {
  const caller = ctx.client.user();
  return caller?.conversationId || caller?.subject || "default";
}

function getCartForContext(ctx: any): CartItem[] {
  const key = getCartKey(ctx);
  if (!carts[key]) {
    carts[key] = [];
  }
  return carts[key];
}

function registerWidget(ctx: any): string {
  const key = getCartKey(ctx);
  const id = Math.random().toString(36).substring(7);
  latestWidgetIds[key] = id;
  return id;
}

function getCartVersion(ctx: any): number {
  const key = getCartKey(ctx);
  if (cartVersions[key] === undefined) {
    cartVersions[key] = 0;
  }
  return cartVersions[key];
}

function incrementCartVersion(ctx: any) {
  const key = getCartKey(ctx);
  if (cartVersions[key] === undefined) {
    cartVersions[key] = 0;
  }
  cartVersions[key]++;
}

// === MENU DATA ===
interface MenuItem {
  id: string;
  name: string;
  type: "beverage" | "food";
  category: string;
  description: string;
  price: number;
  icon: string;
}

const menu: MenuItem[] = [
  // Beverages
  {
    id: "espresso",
    name: "Espresso",
    type: "beverage",
    category: "Espresso",
    description: "Rich and bold single or double shot",
    price: 2.5,
    icon: "☕",
  },
  {
    id: "cappuccino",
    name: "Cappuccino",
    type: "beverage",
    category: "Classic",
    description: "Espresso with steamed milk and foam",
    price: 4.5,
    icon: "☕",
  },
  {
    id: "latte",
    name: "Latte",
    type: "beverage",
    category: "Classic",
    description: "Espresso with steamed milk and light foam",
    price: 4.75,
    icon: "☕",
  },
  {
    id: "americano",
    name: "Americano",
    type: "beverage",
    category: "Espresso",
    description: "Espresso shots with hot water",
    price: 3.5,
    icon: "☕",
  },
  {
    id: "macchiato",
    name: "Macchiato",
    type: "beverage",
    category: "Espresso",
    description: "Espresso marked with a small amount of foam",
    price: 4.0,
    icon: "☕",
  },
  {
    id: "flat-white",
    name: "Flat White",
    type: "beverage",
    category: "Classic",
    description: "Smooth espresso with velvety microfoam",
    price: 4.75,
    icon: "☕",
  },
  {
    id: "mocha",
    name: "Mocha",
    type: "beverage",
    category: "Flavored",
    description: "Espresso with steamed milk and chocolate",
    price: 5.0,
    icon: "🍫",
  },
  {
    id: "caramel-macchiato",
    name: "Caramel Macchiato",
    type: "beverage",
    category: "Flavored",
    description: "Vanilla syrup, espresso, steamed milk, and caramel drizzle",
    price: 5.25,
    icon: "🍯",
  },
  {
    id: "cold-brew",
    name: "Cold Brew",
    type: "beverage",
    category: "Cold",
    description: "Smooth cold-steeped coffee concentrate",
    price: 3.75,
    icon: "🧊",
  },
  {
    id: "iced-latte",
    name: "Iced Latte",
    type: "beverage",
    category: "Cold",
    description: "Espresso with cold milk and ice",
    price: 4.75,
    icon: "🧊",
  },
  {
    id: "cortado",
    name: "Cortado",
    type: "beverage",
    category: "Espresso",
    description: "Equal parts espresso and steamed milk",
    price: 4.0,
    icon: "☕",
  },
  // Food items
  {
    id: "croissant",
    name: "Croissant",
    type: "food",
    category: "Pastry",
    description: "Buttery, flaky French pastry",
    price: 3.5,
    icon: "🥐",
  },
  {
    id: "muffin",
    name: "Chocolate Chip Muffin",
    type: "food",
    category: "Pastry",
    description: "Fresh baked with dark chocolate chips",
    price: 4.0,
    icon: "🧁",
  },
  {
    id: "biscotti",
    name: "Almond Biscotti",
    type: "food",
    category: "Pastry",
    description: "Crispy Italian cookie, perfect for dipping",
    price: 2.5,
    icon: "🍪",
  },
  {
    id: "sandwich",
    name: "Breakfast Sandwich",
    type: "food",
    category: "Food",
    description: "Egg, bacon, and cheese on a fresh roll",
    price: 7.5,
    icon: "🥪",
  },
  {
    id: "avocado-toast",
    name: "Avocado Toast",
    type: "food",
    category: "Food",
    description: "Whole wheat toast with fresh avocado and seasonings",
    price: 8.0,
    icon: "🥑",
  },
];

// === TOOLS ===

/**
 * Browse Menu Tool - Display all menu items with widget
 */
server.tool(
  {
    name: "browse-menu",
    description:
      "Browse the MCPBeans menu of beverages and food. This tool displays the interactive menu browser widget to the user. Do NOT repeat, list, or summarize the menu items in your text response, as the user can already see them in the widget.",
    schema: z.object({
      filter: z
        .enum(["all", "beverages", "food"])
        .optional()
        .describe("Filter by item type"),
    }),
    widget: {
      name: "menu-browser",
      invoking: "Loading menu...",
      invoked: "Menu ready",
    },
  },
  async ({ filter = "all" }, ctx) => {
    const filtered =
      filter === "all"
        ? menu
        : filter === "beverages"
          ? menu.filter((m) => m.type === "beverage")
          : menu.filter((m) => m.type === "food");

    return widget({
      props: {
        items: filtered,
        filter,
        widgetId: registerWidget(ctx),
        cartVersion: getCartVersion(ctx),
        cartItems: getCartForContext(ctx),
      },
      output: text(
        `Showing ${filtered.length} items from MCPBeans menu in the menu widget. Do NOT list or repeat these items in your text response as they are already displayed in the UI widget.`
      ),
    });
  }
);

/**
 * Get Recommendation Tool
 */
server.tool(
  {
    name: "get-recommendation",
    description:
      "Get a personalized beverage recommendation based on your mood or preferences",
    schema: z.object({
      mood: z
        .enum(["energetic", "relaxed", "adventurous", "sweet"])
        .describe("Your current mood or preference"),
    }),
  },
  async ({ mood }) => {
    const recommendations: Record<string, string> = {
      energetic: "espresso",
      relaxed: "cortado",
      adventurous: "caramel-macchiato",
      sweet: "mocha",
    };

    const itemId = recommendations[mood];
    const item = menu.find((m) => m.id === itemId);

    if (!item) {
      return error("Recommendation not available");
    }

    return object({
      name: item.name,
      description: item.description,
      price: item.price,
      icon: item.icon,
      why: `Perfect for your ${mood} mood!`,
    });
  }
);

/**
 * Customize Drink Tool - Let users customize a drink
 */
server.tool(
  {
    name: "customize-drink",
    description: "Customize a beverage with options like size, milk, and shots",
    schema: z.object({
      itemId: z.string().describe("The beverage ID to customize"),
    }),
    widget: {
      name: "drink-customizer",
      invoking: "Opening customizer...",
      invoked: "Customizer ready",
    },
  },
  async ({ itemId }, ctx) => {
    const item = menu.find((m) => m.id === itemId && m.type === "beverage");

    if (!item) {
      return error(`Beverage not found: ${itemId}`);
    }

    return widget({
      props: {
        item: {
          id: item.id,
          name: item.name,
          basePrice: item.price,
          description: item.description,
        },
        widgetId: registerWidget(ctx),
      },
      output: text(`Customizing ${item.name}`),
    });
  }
);

/**
 * Add to Cart Tool
 */
server.tool(
  {
    name: "add-to-cart",
    description: "Add an item to your shopping cart",
    schema: z.object({
      itemId: z.string().describe("Menu item ID"),
      quantity: z.number().min(1).default(1).describe("Quantity"),
      customizations: z
        .object({
          size: z.enum(["small", "medium", "large"]).optional().describe("Size of the beverage"),
          milk: z
            .enum([
              "whole",
              "skim",
              "oat",
              "almond",
              "soy",
              "coconut",
            ])
            .optional()
            .describe("Type of milk"),
          temperature: z.enum(["hot", "cold", "iced"]).optional().describe("Beverage temperature"),
          shots: z.number().optional().describe("Number of espresso shots"),
          flavor: z.string().optional().describe("Flavor syrup additions"),
          extraHot: z.boolean().optional().describe("Whether the drink should be extra hot"),
          noFoam: z.boolean().optional().describe("Whether foam should be excluded"),
          whippedCream: z.boolean().optional().describe("Whether to add whipped cream"),
        })
        .optional()
        .describe("Customizations for the item"),
    }),
  },
  async ({ itemId, quantity, customizations }, ctx) => {
    const item = menu.find((m) => m.id === itemId);

    if (!item) {
      return error(`Item not found: ${itemId}`);
    }

    // Calculate per-item unit price with customizations
    let unitPrice = item.price;
    if (customizations?.size === "large") unitPrice += 0.5;
    if (customizations?.size === "small") unitPrice -= 0.25;
    if (customizations?.shots && customizations.shots > 2)
      unitPrice += (customizations.shots - 2) * 0.75;
    if (customizations?.whippedCream) unitPrice += 0.75;
    const totalPrice = unitPrice * quantity;

    const userCart = getCartForContext(ctx);

    // Upsert into cart (merge quantity if same item+customizations)
    const existing = userCart.find(
      (i) =>
        i.id === itemId &&
        JSON.stringify(i.customizations) === JSON.stringify(customizations)
    );
    if (existing) {
      existing.quantity += quantity;
    } else {
      userCart.push({
        id: itemId,
        name: item.name,
        quantity,
        price: unitPrice,
        customizations,
      });
    }

    incrementCartVersion(ctx);

    return object({
      success: true,
      item: item.name,
      quantity,
      customizations:
        customizations && Object.keys(customizations).length > 0
          ? customizations
          : "None",
      totalPrice: totalPrice.toFixed(2),
      message: `Added ${quantity}x ${item.name} to cart`,
    });
  }
);

/**
 * View Cart Tool - Show shopping cart widget
 */
server.tool(
  {
    name: "view-cart",
    description: "View your shopping cart",
    schema: z.object({}),
    widget: {
      name: "shopping-cart",
      invoking: "Loading cart...",
      invoked: "Cart ready",
    },
  },
  async (_, ctx) => {
    return widget({
      props: {
        cartItems: getCartForContext(ctx),
        widgetId: registerWidget(ctx),
        cartVersion: getCartVersion(ctx),
      },
      output: text("Your shopping cart"),
    });
  }
);

/**
 * Remove from Cart Tool
 */
server.tool(
  {
    name: "remove-from-cart",
    description: "Remove an item from the shopping cart",
    schema: z.object({
      itemId: z.string().describe("Menu item ID to remove"),
      customizations: z
        .object({
          size: z.enum(["small", "medium", "large"]).optional().describe("Beverage size"),
          milk: z.string().optional().describe("Milk choice"),
          temperature: z.enum(["hot", "cold", "iced"]).optional().describe("Temperature"),
          shots: z.number().optional().describe("Number of espresso shots"),
          flavor: z.string().optional().describe("Syrup flavor"),
          extraHot: z.boolean().optional().describe("Extra hot setting"),
          noFoam: z.boolean().optional().describe("No foam setting"),
          whippedCream: z.boolean().optional().describe("Whipped cream setting"),
        })
        .optional()
        .describe("The customizations matching the item to remove"),
    }),
  },
  async ({ itemId, customizations }, ctx) => {
    const userCart = getCartForContext(ctx);
    const idx = userCart.findIndex(
      (item) =>
        item.id === itemId &&
        JSON.stringify(item.customizations) === JSON.stringify(customizations)
    );
    if (idx > -1) {
      const name = userCart[idx].name;
      userCart.splice(idx, 1);
      incrementCartVersion(ctx);
      return text(`Removed ${name} from cart`);
    }
    return error("Item not found in cart");
  }
);

/**
 * Update Cart Quantity Tool
 */
server.tool(
  {
    name: "update-cart-quantity",
    description: "Update the quantity of an item in the shopping cart",
    schema: z.object({
      itemId: z.string().describe("Menu item ID to update"),
      quantity: z.number().min(0).describe("New quantity (0 to remove item)"),
      customizations: z
        .object({
          size: z.enum(["small", "medium", "large"]).optional().describe("Beverage size"),
          milk: z.string().optional().describe("Milk choice"),
          temperature: z.enum(["hot", "cold", "iced"]).optional().describe("Temperature"),
          shots: z.number().optional().describe("Number of espresso shots"),
          flavor: z.string().optional().describe("Syrup flavor"),
          extraHot: z.boolean().optional().describe("Extra hot setting"),
          noFoam: z.boolean().optional().describe("No foam setting"),
          whippedCream: z.boolean().optional().describe("Whipped cream setting"),
        })
        .optional()
        .describe("The customizations matching the item to update"),
    }),
  },
  async ({ itemId, quantity, customizations }, ctx) => {
    const userCart = getCartForContext(ctx);
    const item = userCart.find(
      (i) =>
        i.id === itemId &&
        JSON.stringify(i.customizations) === JSON.stringify(customizations)
    );
    if (!item) {
      return error("Item not found in cart");
    }
    if (quantity === 0) {
      const idx = userCart.indexOf(item);
      userCart.splice(idx, 1);
      incrementCartVersion(ctx);
      return text(`Removed ${item.name} from cart`);
    }
    item.quantity = quantity;
    incrementCartVersion(ctx);
    return text(`Updated ${item.name} quantity to ${quantity}`);
  }
);

/**
 * Clear Cart Tool
 */
server.tool(
  {
    name: "clear-cart",
    description: "Clear all items from the shopping cart",
    schema: z.object({}),
    annotations: {
      destructiveHint: true,
    },
  },
  async (_, ctx) => {
    const key = getCartKey(ctx);
    delete carts[key];
    incrementCartVersion(ctx);
    return text("Your shopping cart has been cleared");
  }
);

/**
 * Checkout Tool - Submit order and clear the cart
 */
server.tool(
  {
    name: "checkout",
    description: "Submit the cart order and clear the cart",
    schema: z.object({}),
    annotations: {
      destructiveHint: true,
    },
  },
  async (_, ctx) => {
    const key = getCartKey(ctx);
    delete carts[key];
    incrementCartVersion(ctx);
    return text("Your order has been placed! Thank you for your purchase.");
  }
);

/**
 * Check Widget Status Tool
 */
server.tool(
  {
    name: "check-widget-status",
    description: "Check if a widget is still the active one and get the latest cart status",
    schema: z.object({
      widgetId: z.string().describe("The ID of the widget checking its status"),
    }),
  },
  async ({ widgetId }, ctx) => {
    const key = getCartKey(ctx);
    const activeId = latestWidgetIds[key];
    const userCart = getCartForContext(ctx);
    
    return object({
      isActive: activeId === undefined || activeId === widgetId,
      cartItems: userCart,
      cartVersion: getCartVersion(ctx),
      cartCount: userCart.reduce((sum, item) => sum + item.quantity, 0),
    });
  }
);

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
console.log(`MCPBeans Coffee Shop running on port ${PORT}`);
server.listen(PORT);
