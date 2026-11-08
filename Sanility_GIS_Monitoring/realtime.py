from qgis.PyQt.QtCore import QTimer

def refresh():
    layers = QgsProject.instance().mapLayersByName("data")
    
    if not layers:
        return  # chưa có layer thì bỏ qua
    
    layer = layers[0]
    layer.dataProvider().forceReload()
    layer.triggerRepaint()
    iface.mapCanvas().refresh()

timer = QTimer()
timer.timeout.connect(refresh)
timer.start(3000)