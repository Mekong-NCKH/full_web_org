CASE

WHEN "name" = 'Xuan Hoa' AND "month" IN (12,1,2) AND "salinity" <= 2 THEN 'Lay nuoc'
WHEN "name" = 'Xuan Hoa' AND "month" IN (3,4) THEN 'Dong ngan man'
WHEN "name" = 'Xuan Hoa' AND "month" IN (5,6,7,8,9,10,11) THEN 'Lay nuoc'

WHEN "name" = 'Vam Giong' AND "month" = 12 AND "salinity" < 2 THEN 'Lay nuoc'
WHEN "name" = 'Vam Giong' AND "month" IN (1,2,3,4,5) THEN 'Dong ngan man'
WHEN "name" = 'Vam Giong' AND "month" = 6 AND "salinity" < 2 THEN 'Lay nuoc'
WHEN "name" = 'Vam Giong' AND "month" IN (7,8,9,10,11) THEN 'Lay nuoc'

WHEN "name" = 'Rach Bun' AND "salinity" > 1.5 THEN 'Dong tru'

WHEN "name" = 'Vam Kenh' AND "salinity" > 1.5 THEN 'Dong tru'

WHEN "name" = 'Go Cong' AND "month" IN (1,2,3,4) THEN 'Dong ngan man'
WHEN "name" = 'Go Cong' AND "month" IN (6,7,8,9,10,11) THEN 'Tru nuoc'

WHEN "name" = 'Go Cat' THEN 'Mo tu do'
WHEN "name" = 'Bao Dinh' THEN 'Mo tu do'

ELSE 'Theo doi'

END