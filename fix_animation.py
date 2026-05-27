import sys

with open('src/app/reservar/[[...paso]]/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''                                      {hasAlternatives && (
                                        <div className="flex bg-bg-base border border-white/[0.05] rounded-lg p-0.5">
                                          <button
                                            onClick={() => {
                                              if (!isCurrentlyMile && mileVersion) {
                                                const newSelected = selectedServices.map(s => s.id === grp.id ? { ...mileVersion, uid: s.uid } : s);
                                                setSelectedServices(newSelected as typeof selectedServices);
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
                                                setSelectedServices(newSelected as typeof selectedServices);
                                              }
                                            }}
                                            className={\px-3 py-1 text-[10px] font-bold tracking-wider rounded-md transition-all \\}
                                          >
                                            STAFF
                                          </button>
                                        </div>
                                      )}'''

replacement = '''                                      {hasAlternatives && (
                                        <div className="relative flex min-w-[110px] bg-bg-base border border-white/[0.05] rounded-lg p-0.5">
                                          <div 
                                            className={\bsolute top-0.5 bottom-0.5 w-[calc(50%-0.125rem)] rounded-md transition-all duration-300 ease-out z-0 \\}
                                          />
                                          <button
                                            onClick={() => {
                                              if (!isCurrentlyMile && mileVersion) {
                                                const newSelected = selectedServices.map(s => s.id === grp.id ? { ...mileVersion, uid: s.uid } : s);
                                                setSelectedServices(newSelected as typeof selectedServices);
                                              }
                                            }}
                                            className={\elative z-10 flex-1 px-3 py-1 text-[10px] font-bold tracking-wider transition-colors duration-300 \\}
                                          >
                                            MILE
                                          </button>
                                          <button
                                            onClick={() => {
                                              if (isCurrentlyMile && staffVersion) {
                                                const newSelected = selectedServices.map(s => s.id === grp.id ? { ...staffVersion, uid: s.uid } : s);
                                                setSelectedServices(newSelected as typeof selectedServices);
                                              }
                                            }}
                                            className={\elative z-10 flex-1 px-3 py-1 text-[10px] font-bold tracking-wider transition-colors duration-300 \\}
                                          >
                                            STAFF
                                          </button>
                                        </div>
                                      )}'''

if target in content:
    content = content.replace(target, replacement)
    with open('src/app/reservar/[[...paso]]/page.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Animation added successfully!")
else:
    print("Target block not found. Checking if it's due to CRLF...")
    target_crlf = target.replace('\n', '\r\n')
    if target_crlf in content:
        content = content.replace(target_crlf, replacement)
        with open('src/app/reservar/[[...paso]]/page.tsx', 'w', encoding='utf-8') as f:
            f.write(content)
        print("Animation added successfully! (CRLF)")
    else:
        print("Target definitely not found!")

