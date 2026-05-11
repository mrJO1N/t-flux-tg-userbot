import { z } from 'zod'
import { Inject } from '../../infrastructure'
import { Controller, Get, Validate } from '../../infrastructure'
import type { Typed, HttpResponse } from '../../infrastructure'
import { RealityService } from './reality.service'
import { RealityRepo } from './reality.repo'

const searchSchema = {
    query: z.object({ query: z.string() }),
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
}
