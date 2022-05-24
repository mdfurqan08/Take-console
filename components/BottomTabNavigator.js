import React, { Component } from "react";
import { View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "react-native-vector-icons/MaterialCommunityIcons";
// import Ionicons from "react-native-vector-icons/Octicons";
import RideScreen from "../screens/Ride";
import RideHistoryScreen from "../screens/RideHistory";
// import { FontAwesome5 } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

export default class BottomTabNavigator extends Component {
  render() {
    return ( 
      <NavigationContainer>
        <Tab.Navigator
        
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;

              if (route.name === "Console") {
                iconName = "microsoft-xbox-controller";
              } else if (route.name === "Console History") {
                iconName = "history";
              }

              // You can return any component that you like here!
              return (
                <Ionicons
                  name={iconName}
                  size={size}
                  color={color}
                  size={60}
                />
              );
            }
          })}
          
          tabBarOptions={{
            activeTintColor: "#ffffff",
            inactiveTintColor: "black",
            style: {
              height: 100,
              borderTopWidth: 0,
              backgroundColor: "darkblue",
                borderRadius: 10
            },
            labelStyle: {
              fontSize: 20,
              fontFamily: "Rajdhani_600SemiBold"
            },
            labelPosition: "below-icon",
            tabStyle: {
              alignItems: "center",
              justifyContent: "center"
            }
          }}
        >
          <Tab.Screen name="Console" component={RideScreen} />
          <Tab.Screen name="Console History" component={RideHistoryScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    );
  }
}
