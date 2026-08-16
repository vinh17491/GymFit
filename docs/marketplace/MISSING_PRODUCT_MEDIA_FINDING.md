# Product Media Audit — Coach4 H15

## Finding

The read-only migration verification report on the configured database reports `product_images_count=1` while the legacy product rows still expose `main_image` values for all 167 products. It also reports `missing_main_images=167` and `main_image_matches=0` for canonical `ProductImages`.

## Scope and safety

- This is an audit finding only.
- No Product, ProductImage, migration, upload, or canonical media row was changed.
- The chatbot must not manufacture an image URL. It may render a media card only when the public Product API returns a valid `primary_image`/image field.
- Any future media repair requires a separate authorized migration or repair task and is not part of Coach4.

## Evidence source

`backend/src/scripts/migrate.ts --status` on 2026-08-08, after confirming all applied migration checksums match.
