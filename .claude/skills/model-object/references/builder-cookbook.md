# Builder cookbook (src/07-furniture.js)

Units are feet. Inside a piece, local axes are: x across the width, y up from the floor, and z depth, with **+z the front**. `T(tag,x,y,z,ry,'name')` places the local origin in the world and turns it by `ry` (counterclockwise in plan). Give every piece a name.

## The P methods (`p = T(...)`)

| Call | Makes | Notes |
|---|---|---|
| `p.b(mat,x,y,z,w,h,d,rY)` | box | `y` is its **bottom**; x/z its centre |
| `p.r(mat,x,y,z,w,h,d,rad,rY)` | rounded box (`roundedGeo`) | the default for anything upholstered or machined; rad 0.02–0.25 |
| `p.c(mat,x,y,z,rTop,rBot,h,seg,rx,rz)` | cylinder or cone | `y` is its bottom; legs, posts, knobs. **Don't** pass rx/rz to lay it down: it offsets by h/2 along y. Use `p.g` with a `CylinderGeometry` and a rotation instead. |
| `p.s(mat,x,y,z,rad,sx,sy,sz)` | sphere or ellipsoid | centred at x,y,z |
| `p.g(mat,geo,x,y,z,rx,rY,rz,s)` | any `BufferGeometry`, centred at x,y,z | lathe, torus, superBox, extrusions |
| `p.col(x,z,w,d,y0,y1)` | collision box | one per footprint |
| `p.wp(x,y,z)` | local → world point | for lamp lights (`LAMPS.push`) |

## Shape helpers

- **`roundedGeo(w,h,d,r)`:** an extruded rounded rectangle with bevel; what `p.r` uses.
- **`superBox(w,h,d,e,ez,pinch,seg,feet)`:** a superellipsoid, for cushions, pillows and plump forms. Small e and ez (0.3–0.5) give a boxy shape; pinch 0.4–0.7 gives sewn corners. Use it through `SB(p,mat,x,y,z,w,h,d,e,ez,{pinch,seg,rot})` in `buildFurniture`.
- **`lathe([[r,y],...],seg)`:** turned profiles: legs, vases, lamp bases, bowls, knobs. Give 6–12 profile points; 24 segments is plenty.
- **`rotE(ry,lean,roll)`:** an Euler for leaning or rolled parts (cushions against a back, a tilted frame).
- **`new THREE.TorusGeometry(r,tube,…,arc)`:** rings, handles, faucet spouts.
- **`new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled,bevelSize,bevelThickness})`:** shaped panels and profiles (arched tops, curved arms). Keep `curveSegments` around 8–12.

## Recipes

- **Upholstered seat:** a base `p.r` with rad about 0.12; seat cushions `SB` (e 0.35, ez 0.8, pinch 0.5) crowned 0.05–0.1 ft above the base top; back cushions `SB` leaned 8–15° with `rotE`; arms `p.r`; a welt is a `TorusGeometry` or thin `p.r` strip along cushion edges.
- **Case good (cabinet or dresser):** a carcass box, then fronts slightly proud with a 0.02 ft reveal over a dark backer, then pulls on standoffs. The kitchen's `front`/`pull` helpers show the pattern.
- **Table:** a top `p.r` (rad 0.03–0.08) with an apron below; legs as tapered `p.c` or `lathe`; a bevel underside via a slightly smaller second top.
- **Metal hardware:** bar = cylinder; standoff = small box or cylinder reaching from the surface to the bar; rose = flat cylinder.
- **Light fixture:** a shade (lathe or cylinder with open ends) in `'shade'` (emissive), a bulb `p.s('light',…)`, and `LAMPS.push({v:p.wp(...),k:'lamp',inst:p._inst})` so it lights at dusk.

## Placement and checks

- **Footprint:** `T()` y is the floor of the level (`e1`…`e4` in `buildFurniture`). Keep the piece inside its room rectangle in `SPEC.rooms`, with a back against a wall at 0.02–0.05 ft gap.
- **Facing into a room:** turn so local +z points into the room (`ry` = 0 faces +z, `Math.PI/2` faces +x, `-Math.PI/2` faces −x, `Math.PI` faces −z).
- **Debug IDs:** names show in Debug IDs and Arrange; Arrange's **Save to code** rewrites the `T()` x, z and ry when they are plain numbers.
