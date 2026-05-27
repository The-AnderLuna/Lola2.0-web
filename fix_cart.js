const fs = require('fs');
let c = fs.readFileSync('src/app/reservar/[[...paso]]/page.tsx', 'utf-8');

c = c.replace(/\)\.map\(grp => \(/g, \.map(grp => {
                                const baseName = grp.nombre.replace(/ - (Mile|Staff)$/i, '').trim();
                                let staffVersion = null;
                                let mileVersion = null;
                                for (const cat of categorias) {
                                  const group = cat.grupos.find(g => g.nombreBase === baseName);
                                  if (group) {
                                    staffVersion = group.servicios.find(v => v.responsable === 'Staff' || v.nombre.toLowerCase().includes('- staff'));
                                    mileVersion = group.servicios.find(v => v.responsable === 'Mile' || v.nombre.toLowerCase().includes('- mile'));
                                    break;
                                  }
                                }
                                const hasAlternatives = staffVersion && mileVersion;
                                const isCurrentlyMile = grp.responsable === 'Mile' || grp.nombre.toLowerCase().includes('- mile');
                                return (\);

c = c.replace(/<h4 className=\"text-sm font-bold text-text-primary leading-tight mb-1 pr-7\">\{grp\.nombre\}<\/h4>/g, 
  \<h4 className="text-sm font-bold text-text-primary leading-tight mb-1 pr-7">{hasAlternatives ? baseName : grp.nombre}</h4>\);

const divTarget = '<div className=\"flex items-center gap-2\">\r\n                                      <button\r\n                                        onClick={() => removeServiceFromCartByUid(grp.uids[grp.uids.length - 1])}';
const divReplacement = \<div className="flex items-center gap-3">
                                      {hasAlternatives && (
                                        <div className="flex bg-bg-base border border-white/[0.05] rounded-lg p-0.5">
                                          <button
                                            onClick={() => {
                                              if (!isCurrentlyMile && mileVersion) {
                                                const newSelected = selectedServices.map(s => s.id === grp.id ? { ...mileVersion, uid: s.uid } : s);
                                                setSelectedServices(newSelected);
                                              }
                                            }}
                                            className={\\\px-3 py-1 text-[10px] font-bold tracking-wider rounded-md transition-all \\\\\\}
                                          >
                                            MILE
                                          </button>
                                          <button
                                            onClick={() => {
                                              if (isCurrentlyMile && staffVersion) {
                                                const newSelected = selectedServices.map(s => s.id === grp.id ? { ...staffVersion, uid: s.uid } : s);
                                                setSelectedServices(newSelected);
                                              }
                                            }}
                                            className={\\\px-3 py-1 text-[10px] font-bold tracking-wider rounded-md transition-all \\\\\\}
                                          >
                                            STAFF
                                          </button>
                                        </div>
                                      )}
                                      <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => removeServiceFromCartByUid(grp.uids[grp.uids.length - 1])}\;
c = c.replace(divTarget, divReplacement);
c = c.replace(divTarget.replace(/\\r\\n/g, '\\n'), divReplacement); // fallback for LF

const endTarget = \                                  </div>
                                </div>
                              ))}\;
const endReplacement = \                                  </div>
                                </div>
                              </div>
                              )})}\;
c = c.replace(endTarget, endReplacement);
c = c.replace(endTarget.replace(/\\r\\n/g, '\\n'), endReplacement);

fs.writeFileSync('src/app/reservar/[[...paso]]/page.tsx', c);
console.log("Done");
