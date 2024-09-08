import { ModuleGraph } from "@/backend/types";

export const sampleModuleGraph: ModuleGraph = {
  "App": ["Header", "Footer", "MainContent"],
  "Header": ["Navigation"],
  "Footer": ["SocialLinks"],
  "MainContent": ["ProductList", "Cart"],
  "Navigation": [],
  "SocialLinks": [],
  "ProductList": ["ProductItem"],
  "Cart": ["CartItem"],
  "ProductItem": [],
  "CartItem": []
};
