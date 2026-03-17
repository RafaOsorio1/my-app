import React, { useEffect, useRef, useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";
import { io, Socket } from "socket.io-client";

const URL = "THE_URL_OF_YOUR_API";

const token = "YOUR_TOKEN_HERE";

export default function App() {
  const socketRef = useRef<Socket | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>("Ningún mensaje aún");
  const [messageCount, setMessageCount] = useState<number>(0);
  const [deviceId, setDeviceId] = useState("T00001");

  const log = (msg: any) => {
    console.log(msg);
    let textMsg = "";

    try {
      textMsg = typeof msg === "string" ? msg : JSON.stringify(msg);
      if (textMsg.length > 200) textMsg = textMsg.substring(0, 200) + "...";
    } catch {
      textMsg = "[Log Error]";
    }

    const time = new Date().toLocaleTimeString();
    setLastMessage(`[${time}] ${textMsg}`);
    setMessageCount((prev) => prev + 1);
  };

  const connect = () => {
    if (socketRef.current?.connected) {
      log("already connected");
      return;
    }

    log("connecting...");

    const socket = io(URL, {
      path: "/socket.io",
      transports: ["websocket"],
      auth: { token },

      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on("connect", () => {
      setConnected(true);
      log(`connected: ${socket.id}`);

      socket.emit("subscribe", { deviceId }, (ack: any) => {
        log({ ack });
      });
    });

    socket.on("disconnect", (reason) => {
      setConnected(false);
      log(`disconnect: ${reason}`);
    });

    socket.on("connect_error", (err) => {
      log(`connect_error: ${err.message}`);
    });

    socket.on("device:data", (data) => {
      log({ event: "device:data", data });
    });

    socket.onAny((event, ...args) => {
      log({ event, args });
    });

    socketRef.current = socket;
  };

  const subscribeDevice = () => {
    if (!socketRef.current?.connected) {
      log("socket not connected");
      return;
    }

    if (!deviceId) {
      log("deviceId is empty");
      return;
    }

    setDeviceId(deviceId);

    log(`sending subscribe for ${deviceId}...`);

    socketRef.current.emit("subscribe", { deviceId }, (ack: any) => {
      log({ ack });
    });
  };

  const unsubscribeDevice = () => {
    if (!socketRef.current?.connected) {
      log("socket not connected");
      return;
    }

    socketRef.current.emit("unsubscribe", { deviceId }, (ack: any) => {
      log({ ack });
    });

    log(`unsubscribe request sent for ${deviceId}`);
  };

  const disconnect = () => {
    if (!socketRef.current) {
      log("not connected");
      return;
    }

    socketRef.current.disconnect();
    socketRef.current = null;
    setConnected(false);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Socket.IO Test</Text>

      <TextInput
        style={styles.input}
        placeholder="Device ID"
        value={deviceId}
        onChangeText={setDeviceId}
      />

      <Button title="Connect" onPress={connect} />

      <View style={{ height: 10 }} />

      <Button title="Subscribe" onPress={subscribeDevice} />

      <View style={{ height: 10 }} />

      <Button title="Unsubscribe" onPress={unsubscribeDevice} />

      <View style={{ height: 10 }} />

      <Button title="Disconnect" color="red" onPress={disconnect} />

      <Text style={styles.status}>
        Status: {connected ? "CONNECTED" : "DISCONNECTED"}
      </Text>

      <View style={styles.logBox}>
        <Text style={styles.logTitle}>
          Último mensaje recibido (Total: {messageCount}):
        </Text>
        <Text style={styles.log}>{lastMessage}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 40,
    paddingTop: 80,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
    color: "#ffffff",
  },
  status: {
    marginVertical: 20,
    fontWeight: "bold",
  },
  logBox: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    minHeight: 80,
  },
  logTitle: {
    fontWeight: "bold",
    marginBottom: 5,
    color: "#ffffff",
  },
  log: {
    fontSize: 12,
    color: "#cccccc",
  },
});
