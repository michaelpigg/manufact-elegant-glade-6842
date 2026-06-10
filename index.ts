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
    description: "Browse the MCPBeans menu of beverages and food",
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
  async ({ filter = "all" }) => {
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
      },
      output: text(`Showing ${filtered.length} items from MCPBeans menu`),
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
      energetic: "double-shot-espresso",
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
  async ({ itemId }) => {
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
          size: z.enum(["small", "medium", "large"]).optional(),
          milk: z
            .enum([
              "whole",
              "skim",
              "oat",
              "almond",
              "soy",
              "coconut",
            ])
            .optional(),
          temperature: z.enum(["hot", "cold", "iced"]).optional(),
          shots: z.number().optional(),
          flavor: z.string().optional(),
          extraHot: z.boolean().optional(),
          noFoam: z.boolean().optional(),
          whippedCream: z.boolean().optional(),
        })
        .optional()
        .describe("Customizations for the item"),
    }),
  },
  async ({ itemId, quantity, customizations }) => {
    const item = menu.find((m) => m.id === itemId);

    if (!item) {
      return error(`Item not found: ${itemId}`);
    }

    // Calculate price with customizations
    let price = item.price * quantity;
    if (customizations?.size === "large") price += 0.5 * quantity;
    if (customizations?.whippedCream) price += 0.75 * quantity;

    return object({
      success: true,
      item: item.name,
      quantity,
      customizations:
        customizations && Object.keys(customizations).length > 0
          ? customizations
          : "None",
      totalPrice: price.toFixed(2),
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
  async () => {
    // Cart data would be managed in widget state
    return widget({
      props: {
        cartItems: [],
      },
      output: text("Your shopping cart"),
    });
  }
);

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
console.log(`MCPBeans Coffee Shop running on port ${PORT}`);
server.listen(PORT);
