import { Controller, Get, Param, Query } from '@nestjs/common';
import { SecuritiesService } from './securities.service';
import { SearchSecuritiesDto } from './dto/search-securities.dto';

@Controller('securities')
export class SecuritiesController {
  constructor(private readonly securitiesService: SecuritiesService) {}

  @Get()
  search(@Query() query: SearchSecuritiesDto) {
    return this.securitiesService.search(query.q);
  }

  @Get(':ticker')
  findOne(@Param('ticker') ticker: string) {
    return this.securitiesService.findByTicker(ticker);
  }
}
