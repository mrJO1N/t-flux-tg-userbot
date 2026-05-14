import { tool } from "@langchain/core/tools";
import { z } from "zod"
import { Inject, Singleton, ConfigProvider } from "../../../infrastructure";

interface YandexGeocoderFeatureMember {
    GeoObject: {
        Point: { pos: string };
    };
}

interface YandexGeocoderResponse {
    response: {
        GeoObjectCollection: {
            featureMember: YandexGeocoderFeatureMember[];
        };
    };
}

interface YandexRouteResponse {
    route: {
        legs: Array<{
            duration: number;
        }>;
    };
}

@Singleton()
export class MapToolsProvider {
    constructor(
        @Inject(ConfigProvider) private config: ConfigProvider,
    ) {
    }

    private async resolveCoords(address: string, city: string): Promise<[number, number]> {
        const query = `${city}, ${address}`;
        const url = `https://geocode-maps.yandex.ru/1.x/?format=json&lang=ru_RU&results=1&apikey=${this.config.YANDEX_MAPS_API_KEY}&geocode=${encodeURIComponent(query)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Geocoder error ${res.status} for "${query}"`);
        const data = await res.json() as YandexGeocoderResponse;
        const members = data.response.GeoObjectCollection.featureMember;
        if (!members.length) throw new Error(`Address not found: "${query}"`);
        // Yandex returns "lng lat" in Point.pos
        const [lng, lat] = members[0]?.GeoObject.Point.pos.split(" ").map(Number) as [number, number];
        return [lat, lng];
    }

    private async getRouteDuration(
        from: [number, number],
        to: [number, number],
        mode: "walking" | "transit",
    ): Promise<number> {
        const waypoints = `${from[0]},${from[1]}|${to[0]},${to[1]}`;
        const url = `https://api.routing.yandex.net/v2/route?apikey=${this.config.YANDEX_MAPS_API_KEY}&waypoints=${encodeURIComponent(waypoints)}&mode=${mode}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Routing error (${mode}): ${res.status}`);
        const data = await res.json() as YandexRouteResponse;
        const seconds = data.route.legs[0]?.duration ?? 0;
        return Math.round(seconds / 60);
    }

    private getRangeTimeTool = tool(
        async ({ from, to, city }: { from: string, to: string, city: string }) => {
            try {
                const [fromCoords, toCoords] = await Promise.all([
                    this.resolveCoords(from, city),
                    this.resolveCoords(to, city),
                ]);

                const [walk, bus] = await Promise.all([
                    this.getRouteDuration(fromCoords, toCoords, "walking"),
                    this.getRouteDuration(fromCoords, toCoords, "transit"),
                ]);

                return JSON.stringify({ walk, bus });
            } catch (e) {
                return `Error: ${(e as Error).message}`;
            }
        },
        {
            name: "get_range_time",
            description: "Get estimated travel time in minutes between two addresses — on foot and by public transport. Addresses are geocoded via Yandex Maps. Returns { walk: number, bus: number }.",
            schema: z.object({
                from: z.string().describe("Origin address, e.g. 'Виноградная 195' or a full address string"),
                to: z.string().describe("Destination address, e.g. 'Горького 60' or a full address string"),
                city: z.string().describe("City context for geocoding short addresses, e.g. 'Сочи' or 'Краснодар'"),
            }),
        }
    );

    get tools() {
        return [
            this.getRangeTimeTool,
        ]
    }
}
