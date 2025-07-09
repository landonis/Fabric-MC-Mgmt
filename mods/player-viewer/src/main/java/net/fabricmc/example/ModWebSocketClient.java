
package net.fabricmc.example;

import net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.network.ServerPlayerEntity;
import okhttp3.*;

import java.util.concurrent.TimeUnit;
import java.io.FileInputStream;
import java.io.IOException;
import java.util.Properties;


public class ModWebSocketClient {

    private static final OkHttpClient client = new OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .build();
    private static WebSocket socket;
    
    private static String getWebSocketUrl() {
        Properties props = new Properties();
        try {
            FileInputStream fis = new FileInputStream("mods/player-viewer/.env");
            props.load(fis);
            fis.close();
            String url = props.getProperty("WEBSOCKET_SERVER");
            if (url != null && !url.isEmpty()) {
                return url;
            }
        } catch (IOException ignored) {}
        return "ws://localhost:3020";
    }


    private static final String WS_URL = getWebSocketUrl();

    public static void init(MinecraftServer server) {
        Request request = new Request.Builder().url(WS_URL).build();
        socket = client.newWebSocket(request, new WebSocketListener() {
            
            @Override
            public void onMessage(WebSocket webSocket, String text) {
                try {
                    com.google.gson.JsonObject msg = new com.google.gson.JsonParser().parse(text).getAsJsonObject();
                    if (msg.has("type") && "teleport".equals(msg.get("type").getAsString())) {
                        String target = msg.get("target").getAsString();
                        double x = msg.get("x").getAsDouble();
                        double y = msg.get("y").getAsDouble();
                        double z = msg.get("z").getAsDouble();

                        net.minecraft.server.MinecraftServer server = net.fabricmc.loader.api.FabricLoader.getInstance()
                            .getGameInstance();

                        server.execute(() -> {
                            var players = server.getPlayerManager().getPlayerList();
                            for (var player : players) {
                                if (player.getEntityName().equals(target)) {
                                    player.teleport(x, y, z);
                                    System.out.println("[FabricMod] Teleported " + target + " to " + x + " " + y + " " + z);
                                    break;
                                }
                            }
                        });
                    }
                } catch (Exception e) {
                    System.err.println("[FabricMod] Failed to parse or execute teleport: " + e.getMessage());
                }
            }
    

@Override
            public void onOpen(WebSocket webSocket, Response response) {
                System.out.println("[FabricMod] Connected to WebSocket backend.");
            }

            @Override
            public void onFailure(WebSocket webSocket, Throwable t, Response response) {
                System.err.println("[FabricMod] WebSocket error: " + t.getMessage());
            }
        });

        ServerTickEvents.END_WORLD_TICK.register(world -> {
            for (ServerPlayerEntity player : world.getPlayers()) {
                String json = String.format("{\"uuid\":\"%s\",\"name\":\"%s\",\"x\":%.2f,\"y\":%.2f,\"z\":%.2f}",
                        player.getUuidAsString(),
                        player.getName().getString(),
                        player.getX(), player.getY(), player.getZ()
                );
                if (socket != null) {
                    socket.send(json);
                }
            }
        });
    }
}
