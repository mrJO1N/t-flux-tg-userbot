import { z } from 'zod'
import { Inject, Post } from '../../infrastructure'
import { Controller, Get, Validate } from '../../infrastructure'
import type { Typed, HttpResponse, HttpRequest } from '../../infrastructure'
import { RealityService } from './reality.service'
import { RealityRepo } from './reality.repo'

const searchSchema = {
    query: z.object({ query: z.string() }),
} as const

const getByIdSchema = {
    params: z.object({ id: z.string() }),
} as const

@Controller('/api/reality')
export class RealityController {
    constructor(
        @Inject(RealityService) private readonly realityService: RealityService,
        @Inject(RealityRepo) private readonly realityRepo: RealityRepo
    ) { }

    @Get('/search')
    async searchRealityObjects(
        @Validate(searchSchema) req: Typed<typeof searchSchema>,
        res: HttpResponse
    ) {
        const result = await this.realityRepo.search(req.query.query)
        res.json(result)
    }

    @Get("/:id")
    async getById(
        @Validate(getByIdSchema) req: Typed<typeof getByIdSchema>,
        res: HttpResponse
    ) {
        const id = req.params.id
        const result = await this.realityRepo.findById(id)
        res.json(result)
    }

    @Post("/seed")
    async seed(
        req: HttpRequest,
        res: HttpResponse
    ) {
        const templates = [
            {
                fullAddress: {
                    city: "сочи",
                    district: "центральный",
                    street: "виноградная",
                    houseNumber: 195,
                    buildingType: "new building" as const,
                    floor: 10,
                    floorTotal: 17,
                    seaDistance: 300,
                },
                area: {
                    totalSqm: 28.3,
                    livingSqm: 25.3,
                    roomsCount: 0,
                    layout: "euro" as const,
                    view: "sea" as const,
                    bathroomSqm: 5.3,
                    bathroomType: "combined" as const,
                    description: "",
                    agentNotes: "",
                },
                negotiable: false,
                price: 30_000,
                dealType: "rent-monthly" as const,
                source: "own-base" as const,
                sourceUrl: "https://google.com",
            },
            {
                fullAddress: {
                    city: "сочи",
                    district: "центральный",
                    street: "донская",
                    houseNumber: 12,
                    buildingType: "monolith" as const,
                    floor: 3,
                    floorTotal: 9,
                    seaDistance: 1200,
                },
                area: {
                    totalSqm: 42,
                    livingSqm: 18,
                    kitchenSqm: 10,
                    roomsCount: 1,
                    layout: "separate" as const,
                    view: "courtyard" as const,
                    bathroomSqm: 4.5,
                    bathroomType: "combined" as const,
                    ceilingHeight: 2.7,
                    description: "",
                    agentNotes: "",
                },
                negotiable: true,
                price: 3_800_000,
                dealType: "sale" as const,
                source: "avito" as const,
                sourceUrl: "https://avito.ru/sochi/kvartiry/42",
            },
            {
                fullAddress: {
                    city: "сочи",
                    district: "адлерский",
                    street: "ленина",
                    houseNumber: 78,
                    buildingType: "panel" as const,
                    floor: 5,
                    floorTotal: 12,
                    seaDistance: 2000,
                    metroStations: ["аэропорт"],
                    metroDistanceMin: 15,
                },
                area: {
                    totalSqm: 56,
                    livingSqm: 30,
                    kitchenSqm: 8,
                    roomsCount: 2,
                    layout: "adjacent" as const,
                    view: "mountains" as const,
                    bathroomSqm: 6,
                    bathroomType: "separate" as const,
                    balconySqm: 4.5,
                    balconyType: "loggia" as const,
                    ceilingHeight: 2.65,
                    description: "",
                    agentNotes: "",
                },
                negotiable: true,
                price: 8_000,
                dealType: "rent-daily" as const,
                source: "cian" as const,
                sourceUrl: "https://cian.ru/rent/flat/sochi/56",
            },
            {
                fullAddress: {
                    city: "сочи",
                    district: "лазаревский",
                    street: "победы",
                    houseNumber: 34,
                    buildingType: "brick" as const,
                    floor: 8,
                    floorTotal: 10,
                    seaDistance: 500,
                },
                area: {
                    totalSqm: 78,
                    livingSqm: 48,
                    kitchenSqm: 12,
                    roomsCount: 3,
                    layout: "separate" as const,
                    view: "sea" as const,
                    bathroomSqm: 7,
                    bathroomType: "separate" as const,
                    balconySqm: 6,
                    balconyType: "balcony" as const,
                    ceilingHeight: 3.0,
                    description: "",
                    agentNotes: "",
                },
                negotiable: false,
                price: 12_500_000,
                dealType: "sale" as const,
                source: "own-base" as const,
                sourceUrl: "https://google.com",
            },
            {
                fullAddress: {
                    city: "сочи",
                    district: "центральный",
                    street: "навагинская",
                    houseNumber: 9,
                    buildingType: "new building" as const,
                    floor: 15,
                    floorTotal: 25,
                    seaDistance: 150,
                },
                area: {
                    totalSqm: 32,
                    livingSqm: 22,
                    kitchenSqm: 7,
                    roomsCount: 0,
                    layout: "studio" as const,
                    view: "street" as const,
                    bathroomSqm: 4,
                    bathroomType: "combined" as const,
                    ceilingHeight: 3.2,
                    description: "",
                    agentNotes: "",
                },
                negotiable: false,
                price: 6_000,
                dealType: "rent-daily" as const,
                source: "avito" as const,
                sourceUrl: "https://avito.ru/sochi/kvartiry/32",
            },
        ]

        const result = await Promise.all(templates.map(newOne => this.realityRepo.findOrCreate(newOne)))
        res.json(result)
    }
}
