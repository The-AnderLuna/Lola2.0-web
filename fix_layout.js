const fs = require('fs');
let code = fs.readFileSync('src/app/reservar/[[...paso]]/page.tsx', 'utf8');

// 1. Add cuponId to the checkout payload
code = code.replace(
  /body: JSON.stringify\(\{\n\s*bloqueoId,\n\s*cliente:(.*?\n.*?metodoPago,\n\s*totalAbono\n\s*\}\)/s,
  (match) => match.replace('totalAbono\n', 'totalAbono,\n                              cuponId: cuponActivo?.id,\n                              totalPrecio\n')
);

// 2. Reorganize step 4 layout
const originalRightCol =                 {/* COLUMNA DERECHA: MÉTODO DE PAGO Y CONFIRMACIÓN */}
                <div className="flex flex-col gap-6">

                  {/* ABONO REQUERIDO */}
                  <div className="w-full bg-gold/10 border border-gold/30 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                    <div>
                      <p className="text-xs text-text-secondary font-bold uppercase tracking-wider">Abono requerido hoy</p>
                      <p className="text-[10px] text-gold/80 mt-1 uppercase tracking-widest font-semibold">Asegura tus espacios</p>
                    </div>
                    <p className="text-3xl font-bold text-gold drop-shadow-[0_0_10px_rgba(212,175,55,0.3)]">{formatCurrency(totalAbono)}</p>
                  </div>;

const newRightCol =                 {/* COLUMNA DERECHA: MÉTODO DE PAGO Y CONFIRMACIÓN */}
                <div className="flex flex-col gap-6">

                  {/* SECCIÓN CUPÓN */}
                  <div className="bg-bg-card border border-border-subtle rounded-3xl p-6 shadow-xl">
                    <p className="text-xs text-text-muted uppercase tracking-wider font-bold mb-4 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold"><path d="M12 2v20"/><path d="m17 5-5-3-5 3v14l5 3 5-3z"/></svg>
                      ¿Tienes un cupón?
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={codigoCupon}
                        onChange={(e) => setCodigoCupon(e.target.value.toUpperCase())}
                        placeholder="Ingresa tu código"
                        className="flex-1 bg-bg-surface border border-border-subtle rounded-xl px-4 py-3 text-sm focus:border-gold outline-none uppercase font-semibold tracking-wider text-text-primary"
                        disabled={validandoCupon || cuponActivo !== null}
                      />
                      {cuponActivo ? (
                        <button
                          onClick={removerCupon}
                          className="px-4 py-3 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl font-bold text-sm hover:bg-rose-500/20 transition-all"
                        >
                          Quitar
                        </button>
                      ) : (
                        <button
                          onClick={validarCupon}
                          disabled={!codigoCupon.trim() || validandoCupon}
                          className="px-6 py-3 bg-gold/10 text-gold border border-gold/30 rounded-xl font-bold text-sm hover:bg-gold/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {validandoCupon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aplicar'}
                        </button>
                      )}
                    </div>
                    {cuponError && (
                      <p className="text-rose-400 text-xs mt-2 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {cuponError}
                      </p>
                    )}
                    {cuponActivo && (
                      <p className="text-green-400 text-xs mt-2 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> ¡Cupón de {cuponActivo.porcentaje_descuento}% aplicado!
                      </p>
                    )}
                  </div>;

const abonoBlock = 
                  {/* ABONO REQUERIDO */}
                  <div className="w-full bg-gold/10 border border-gold/30 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                    <div>
                      <p className="text-xs text-text-secondary font-bold uppercase tracking-wider">Abono requerido hoy</p>
                      <p className="text-[10px] text-gold/80 mt-1 uppercase tracking-widest font-semibold">Asegura tus espacios</p>
                    </div>
                    <div className="flex flex-col items-end">
                      {cuponActivo && (
                        <p className="text-sm font-semibold text-text-muted line-through mb-0.5">{formatCurrency(totalAbonoSinDescuento)}</p>
                      )}
                      <p className="text-3xl font-bold text-gold drop-shadow-[0_0_10px_rgba(212,175,55,0.3)]">{formatCurrency(totalAbono)}</p>
                    </div>
                  </div>;

// Insert the Abono block into the LEFT column, right after the "RESUMEN DE RESERVA" inner div ends
code = code.replace(
  /(<div className="bg-bg-surface rounded-2xl p-4 border border-border-subtle space-y-3">.*?<\/div>\n\s*<\/div>\n\s*<\/div>)/s,
  "\n" + abonoBlock
);

// Replace the right column's abono block with the Coupon block
code = code.replace(originalRightCol, newRightCol);

fs.writeFileSync('src/app/reservar/[[...paso]]/page.tsx', code, 'utf8');
console.log('Done modifying layout.');
