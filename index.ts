// Must be first import for React Navigation on native
import "react-native-gesture-handler";

import { registerRootComponent } from "expo";
import App from "./src/App";

registerRootComponent(App);