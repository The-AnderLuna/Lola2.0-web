import sys

content = open('src/app/reservar/[[...paso]]/page.tsx', 'r', encoding='utf-8').read()

target1 = '''                              ).map(grp => ('''
replace1 = '''                              ).map(grp => {
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
                                return ('''

target2 = '''                                  <h4 className="text-sm font-bold text-text-primary leading-tight mb-1 pr-7">{grp.nombre}</h4>'''
replace2 = '''                                  <h4 className="text-sm font-bold text-text-primary leading-tight mb-1 pr-7">{hasAlternatives ? baseName : grp.nombre}</h4>'''

target3 = '''                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => removeServiceFromCartByUid(grp.uids[grp.uids.length - 1])}'''
replace3 = '''                                    <div className="flex items-center gap-3">
                                      {hasAlternatives && (
                                        <div className="flex bg-bg-base border border-white/[0.05] rounded-lg p-0.5">
                                          <button
                                            onClick={() => {
                                              if (!isCurrentlyMile && mileVersion) {
                                                const newSelected = selectedServices.map(s => s.id === grp.id ? { ...mileVersion, uid: s.uid } : s);
                                                setSelectedServices(newSelected);
                                              }
                                            }}
                                            className={\px-3 py-1 text-[10px] font-bold tracking-wider rounded-md transition-all \\}
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
                                            className={\px-3 py-1 text-[10px] font-bold tracking-wider rounded-md transition-all \\}
                                          >
                                            STAFF
                                          </button>
                                        </div>
                                      )}
                                      <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => removeServiceFromCartByUid(grp.uids[grp.uids.length - 1])}'''

target4 = '''                                  </div>
                                </div>
                              ))}'''
replace4 = '''                                  </div>
                                </div>
                              </div>
                              )})}'''

if target1 in content:
    content = content.replace(target1, replace1)
    content = content.replace(target2, replace2)
    content = content.replace(target3, replace3)
    content = content.replace(target4, replace4)
    open('src/app/reservar/[[...paso]]/page.tsx', 'w', encoding='utf-8').write(content)
    print('Replaced successfully')
else:
    print('Target not found')
