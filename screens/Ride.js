import React, { Component } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  ImageBackground,
  Image,
  Alert,
  KeyboardAvoidingView,
  ToastAndroid
} from "react-native";
import * as Permissions from "expo-permissions";
import { BarCodeScanner } from "expo-barcode-scanner";
import firebase from "firebase";
import db from "../config";

const bgImage = require("../assets/background2.png");
const appIcon = require("../assets/appIcon3.png");

export default class RideScreen extends Component {
  constructor(props) {
    super(props);
    this.state = {
      consoleId: "",
      userId: "",
      domState: "normal",
      hasCameraPermissions: null,
      scanned: false,
      consoleType: "",
      userName: ""
    };
  }

  getCameraPermissions = async () => {
    const { status } = await Permissions.askAsync(Permissions.CAMERA);

    this.setState({
      /*status === "granted" is true when user has granted permission
          status === "granted" is false when user has not granted the permission
        */
      hasCameraPermissions: status === "granted",
      domState: "scanner",
      scanned: false
    });
  };

  handleBarCodeScanned = async ({ type, data }) => {
    this.setState({
      consoleId: data,
      domState: "normal",
      scanned: true
    });
  };

  handleTransaction = async () => {
    var { consoleId, userId } = this.state;
    await this.getConsoleDetails(consoleId);
    await this.getUserDetails(userId);

    var transactionType = await this.checkConsoleAvailability(consoleId);

    if (!transactionType) {
      this.setState({ consoleId: "" });
      Alert.alert("Kindly enter/scan valid console id");
    } else if (transactionType === "under_maintenance") {
      this.setState({
        consoleId: ""
      });
    } else if (transactionType === "rented") {
      var isEligible = await this.checkUserEligibilityForStartRide(userId);

      if (isEligible) {
        var { consoleType, userName } = this.state;
        this.assignConsole(consoleId, userId, consoleType, userName);
        Alert.alert(
          "You have rented the console for next 1 hour. Enjoy your gaming!!!"
        );
        this.setState({
          consoleAssigned: true
        });

        // For Android users only
        // ToastAndroid.show(
        //   "You have rented the console for next 1 hour. Enjoy your ride!!",
        //   ToastAndroid.SHORT
        // );
      }
    } else {
      var isEligible = await this.checkUserEligibilityForEndRide(
        consoleId,
        userId
      );

      if (isEligible) {
        var { consoleType, userName } = this.state;
        this.returnConsole(consoleId, userId, consoleType, userName);
        Alert.alert("We hope you enjoyed your console");
        this.setState({
          consoleAssigned: false
        });

        // For Android users only
        // ToastAndroid.show(
        //   "We hope you enjoyed your ride",
        //   ToastAndroid.SHORT
        // );
      }
    }
  };

  getConsoleDetails = consoleId => {
    consoleId = consoleId.trim();
    db.collection("console")
      .where("id", "==", consoleId)
      .get()
      .then(snapshot => {
        snapshot.docs.map(doc => {
          this.setState({
            consoleType: doc.data().console_type
          });
        });
      });
  };

  getUserDetails = userId => {
    db.collection("users")
      .where("id", "==", userId)
      .get()
      .then(snapshot => {
        snapshot.docs.map(doc => {
          this.setState({
            userName: doc.data().name,
            userId: doc.data().id,
            consoleAssigned: doc.data().console_assigned
          });
        });
      });
  };

  checkconsoleAvailability = async consoleId => {
    const consoleRef = await db
      .collection("console")
      .where("id", "==", consoleId)
      .get();

    var transactionType = "";
    if (consoleRef.docs.length == 0) {
      transactionType = false;
    } else {
      consoleRef.docs.map(doc => {
        if (!doc.data().under_maintenance) {
          //if the console is available then transaction type will be rented
          // otherwise it will be return
          transactionType = doc.data().is_console_available ? "rented" : "return";
        } else {
          transactionType = "under_maintenance";
          Alert.alert(doc.data().maintenance_message);
        }
      });
    }

    return transactionType;
  };

  checkUserEligibilityForStartRide = async userId => {
    const userRef = await db
      .collection("users")
      .where("id", "==", userId)
      .get();

    var isUserEligible = false;
    if (userRef.docs.length == 0) {
      this.setState({
        consoleId: ""
      });
      isUserEligible = false;
      Alert.alert("Invalid user id");
    } else {
      userRef.docs.map(doc => {
        if (!doc.data().console_assigned) {
          isUserEligible = true;
        } else {
          isUserEligible = false;
          Alert.alert("End the current playing to rent another console.");
          this.setState({
            consoleId: ""
          });
        }
      });
    }

    return isUserEligible;
  };

  checkUserEligibilityForEndRide = async (consoleId, userId) => {
    const transactionRef = await db
      .collection("transactions")
      .where("console_id", "==", consoleId)
      .limit(1)
      .get();
    var isUserEligible = "";
    transactionRef.docs.map(doc => {
      var lastConsoleTransaction = doc.data();
      if (lastconsoleTransaction.user_id === userId) {
        isUserEligible = true;
      } else {
        isUserEligible = false;
        Alert.alert("This console is rented by another user");
        this.setState({
          consoleId: ""
        });
      }
    });
    return isUserEligible;
  };

  assignConsole = async (consoleId, userId, consoleType, userName) => {
    //add a transaction
    db.collection("transactions").add({
      user_id: userId,
      user_name: userName,
      console_id: consoleId,
      console_type: consoleType,
      date: firebase.firestore.Timestamp.now().toDate(),
      transaction_type: "rented"
    });
    //change console status
    db.collection("console")
      .doc(consoleId)
      .update({
        is_console_available: false
      });
    //change value  of console assigned for user
    db.collection("users")
      .doc(userId)
      .update({
        console_assigned: true
      });

    // Updating local state
    this.setState({
      consoleId: ""
    });
  };

  returnConsole = async (consoleId, userId, consoleType, userName) => {
    //add a transaction
    db.collection("transactions").add({
      user_id: userId,
      user_name: userName,
      console_id: consoleId,
      console_type: consoleType,
      date: firebase.firestore.Timestamp.now().toDate(),
      transaction_type: "return"
    });
    //change console status
    db.collection("console")
      .doc(consoleId)
      .update({
        is_console_available: true
      });
    //change value  of console assigned for user
    db.collection("users")
      .doc(userId)
      .update({
        console_assigned: false
      });

    // Updating local state
    this.setState({
      consoleId: ""
    });
  };

  render() {
    const { consoleId, userId, domState, scanned, consoleAssigned } = this.state;
    if (domState !== "normal") {
      return (
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : this.handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
        />
      );
    }
    return (
      <KeyboardAvoidingView behavior="padding" style={styles.container}>
        <View style={styles.upperContainer}>
          <Image source={appIcon} style={styles.appIcon} />
          <Text style={styles.title}>Take-Console</Text>
          <Text style={styles.subtitle}>Play Unlimited!</Text>
        </View>
        <View style={styles.lowerContainer}>
          <View style={styles.textinputContainer}>
            <TextInput
              style={[styles.textinput, { width: "82%" }]}
              onChangeText={text => this.setState({ userId: text })}
              placeholder={"User Id"}
              placeholderTextColor={"#000000"}
              value={userId}
            />
          </View>
          <View style={[styles.textinputContainer, { marginTop: 25 }]}>
            <TextInput
              style={styles.textinput}
              onChangeText={text => this.setState({ consoleId: text })}
              placeholder={"Console Id"}
              placeholderTextColor={"#000000"}
              value={consoleId}
              autoFocus
            />
            <TouchableOpacity
              style={styles.scanbutton}
              onPress={() => this.getCameraPermissions()}
            >
              <Text style={styles.scanbuttonText}>Scan</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, { marginTop: 25 }]}
            onPress={this.handleTransaction}
          >
            <Text style={styles.buttonText}>
              {consoleAssigned ? "End Ride" : "Unlock"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
      borderRadius: 10
  },
  bgImage: {
    flex: 1,
    resizeMode: "cover",
    justifyContent: "center"
  },
  upperContainer: {
    flex: 0.5,
    justifyContent: "center",
    alignItems: "center"
  },
  appIcon: {
    width: 200,
    height: 200,
    resizeMode: "contain",
    marginTop: 80
  },
  title: {
    fontSize: 40,
    fontFamily: "Rajdhani_600SemiBold",
    paddingTop: 20,
    color: "#4C5D70"
  },
  subtitle: {
    fontSize: 20,
    fontFamily: "Rajdhani_600SemiBold",
    color: "#4C5D70"
  },
  lowerContainer: {
    flex: 0.5,
    alignItems: "center"
  },
  textinputContainer: {
    borderWidth: 2,
    borderRadius: 10,
    flexDirection: "row",
    backgroundColor: "#4C5D70",
    borderColor: "#4C5D70"
  },
  textinput: {
    width: "57%",
    height: 50,
    padding: 10,
    borderColor: "#4C5D70",
    borderRadius: 10,
    borderWidth: 3,
    fontSize: 18,
    backgroundColor: "#ffffff",
    fontFamily: "Rajdhani_600SemiBold",
    color: "#000000"
  },
  scanbutton: {
    width: 100,
    height: 50,
    backgroundColor: "black",
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    justifyContent: "center",
    alignItems: "center"
  },
  scanbuttonText: {
    fontSize: 24,
    color: "#ffffff",
      borderRadius: 10,
    fontFamily: "Rajdhani_600SemiBold"
  },
  button: {
    width: "43%",
    height: 55,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#4C5D70"
  },
  buttonText: {
    fontSize: 24,
    color: "#4C5D70",
    fontFamily: "Rajdhani_600SemiBold"
  }
});
