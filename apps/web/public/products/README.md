# Real product photos

One transparent PNG per product, named after the BAUHAUS article number (e.g. `27766541.png`).

- Background removed (transparent), product standing upright, front view.
- At least 1200 px on the longer side; crop tight to the product.
- Then fill in `apps/api/src/products/real-products.json`: `price`, `dimensions` (w × h × d in metres, as on the product page), `colors`.

A product is only listed once price, dimensions, colour and its photo are all present. The API logs what is missing on start.
