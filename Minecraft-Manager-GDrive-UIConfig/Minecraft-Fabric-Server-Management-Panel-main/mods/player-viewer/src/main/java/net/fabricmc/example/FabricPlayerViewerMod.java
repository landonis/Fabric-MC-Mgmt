import net.fabricmc.example.ModWebSocketClient;
package net.fabricmc.example;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import com.google.gson.*;

import net.fabricmc.api.ModInitializer;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.item.ItemStack;
import net.minecraft.text.Text;
import net.minecraft.util.math.BlockPos;

import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.util.*;
import java.util.stream.Collectors;

public class FabricPlayerViewerMod implements ModInitializer {
    private static final int PORT = 8080;
    private static final Gson gson = new Gson();
    private static MinecraftServer serverRef;

    @Override
    public void onInitialize() {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", PORT), 0);

            server.createContext("/players", exchange -> {
                JsonArray playersJson = new JsonArray();
                if (serverRef != null) {
                    for (ServerPlayerEntity player : serverRef.getPlayerManager().getPlayerList()) {
                        playersJson.add(playerToJson(player));
                    }
                }
                respondJson(exchange, playersJson);
            });

            server.createContext("/players/", exchange -> {
                String path = exchange.getRequestURI().getPath().replace("/players/", "");
                String[] parts = path.split("/");

                if (parts.length < 2) {
                    respondError(exchange, 400, "Missing UUID or subresource.");
                    return;
                }

                String uuid = parts[0];
                String subresource = parts[1];

                ServerPlayerEntity player = getPlayerByUUID(uuid);
                if (player == null) {
                    respondError(exchange, 404, "Player not found");
                    return;
                }

                switch (subresource) {
                    case "inventory" -> {
                        JsonArray inventory = new JsonArray();
                        for (ItemStack stack : player.getInventory().main) {
                            if (!stack.isEmpty()) {
                                JsonObject item = new JsonObject();
                                item.addProperty("item", stack.getItem().toString());
                                item.addProperty("count", stack.getCount());
                                inventory.add(item);
                            }
                        }
                        respondJson(exchange, inventory);
                    }
                    case "position" -> {
                        BlockPos pos = player.getBlockPos();
                        JsonObject position = new JsonObject();
                        position.addProperty("x", pos.getX());
                        position.addProperty("y", pos.getY());
                        position.addProperty("z", pos.getZ());
                        position.addProperty("dimension", player.getWorld().getRegistryKey().getValue().toString());
                        respondJson(exchange, position);
                    }
                    case "kick" -> {
                        if (!exchange.getRequestMethod().equalsIgnoreCase("POST")) {
                            respondError(exchange, 405, "Method not allowed");
                            return;
                        }
                        JsonObject body = JsonParser.parseReader(new InputStreamReader(exchange.getRequestBody())).getAsJsonObject();
                        String reason = body.has("reason") ? body.get("reason").getAsString() : "Kicked by admin";
                        player.networkHandler.disconnect(Text.of(reason));
                        respondJson(exchange, Map.of("success", true));
                    }
                    case "message" -> {
                        if (!exchange.getRequestMethod().equalsIgnoreCase("POST")) {
                            respondError(exchange, 405, "Method not allowed");
                            return;
                        }
                        JsonObject body = JsonParser.parseReader(new InputStreamReader(exchange.getRequestBody())).getAsJsonObject();
                        String message = body.has("message") ? body.get("message").getAsString() : "";
                        player.sendMessage(Text.of(message), false);
                        respondJson(exchange, Map.of("success", true));
                    }
                    default -> respondError(exchange, 404, "Unknown subresource");
                }
            });

            server.setExecutor(null);
            server.start();
            System.out.println("[FabricPlayerViewerMod] HTTP Server started on port " + PORT);
        } catch (IOException e) {
            System.err.println("[FabricPlayerViewerMod] Failed to start HTTP server: " + e.getMessage());
        }

        System.out.println("FabricPlayerViewerMod initialized");
    }

    public static void setServerRef(MinecraftServer server) {
        serverRef = server;
    }

    private static ServerPlayerEntity getPlayerByUUID(String uuid) {
        return serverRef.getPlayerManager().getPlayerList().stream()
            .filter(p -> p.getUuidAsString().equals(uuid))
            .findFirst()
            .orElse(null);
    }

    private static JsonObject playerToJson(ServerPlayerEntity player) {
        JsonObject json = new JsonObject();
        json.addProperty("username", player.getEntityName());
        json.addProperty("uuid", player.getUuidAsString());

        BlockPos pos = player.getBlockPos();
        JsonObject position = new JsonObject();
        position.addProperty("x", pos.getX());
        position.addProperty("y", pos.getY());
        position.addProperty("z", pos.getZ());
        json.add("position", position);

        JsonArray inventory = new JsonArray();
        for (ItemStack stack : player.getInventory().main) {
            if (!stack.isEmpty()) {
                JsonObject item = new JsonObject();
                item.addProperty("item", stack.getItem().toString());
                item.addProperty("count", stack.getCount());
                inventory.add(item);
            }
        }
        json.add("inventory", inventory);
        return json;
    }

    private static void respondJson(HttpExchange exchange, Object obj) throws IOException {
        byte[] response = gson.toJson(obj).getBytes();
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(200, response.length);
        OutputStream os = exchange.getResponseBody();
        os.write(response);
        os.close();
    }

    private static void respondError(HttpExchange exchange, int status, String message) throws IOException {
        JsonObject error = new JsonObject();
        error.addProperty("error", message);
        byte[] response = gson.toJson(error).getBytes();
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, response.length);
        OutputStream os = exchange.getResponseBody();
        os.write(response);
        os.close();
    }
}