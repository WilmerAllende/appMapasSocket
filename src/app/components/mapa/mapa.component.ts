import { Lugar } from '../../interfaces/lugar';
import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { WebsocketService } from '../../services/websocket.service';

@Component({
  selector: 'app-mapa',
  templateUrl: './mapa.component.html',
  styleUrls: ['./mapa.component.css'],
})
export class MapaComponent implements OnInit, AfterViewInit {
  @ViewChild('map') mapaElement: ElementRef;
  map: google.maps.Map;
  marcadores: google.maps.Marker[] = [];
  infoWindows: google.maps.InfoWindow[] = [];
  lugares: Lugar[] = [];
  constructor(private http: HttpClient, public wsService: WebsocketService) {}

  ngOnInit(): void {
    this.escucharSockets();
  }
  ngAfterViewInit(): void {
    this.http
      .get('http://localhost:5000/marcadores')
      .subscribe((data: Lugar[]) => {
        // console.log(data);
        this.lugares = data;
        this.cargarMapa();
      });
  }

  escucharSockets() {
    // marcador-nuevo
    this.wsService.listen('agregar-marcador').subscribe((marcador: Lugar) => {
      this.agregarMarcador(marcador);
    });
    // TODO: marcador-mover
    this.wsService.listen('marcador-mover').subscribe((marcador: Lugar) => {
      for (const i in this.marcadores) {
        if (this.marcadores[i].getTitle() === marcador.id) {
          const latLng = new google.maps.LatLng(marcador.lat, marcador.lng);
          this.marcadores[i].setPosition(latLng);
          break;
        }
      }
    });
    // marcador-borrar
    this.wsService.listen('marcador-borrar').subscribe((id: string) => {
      for (const i in this.marcadores) {
        if (this.marcadores[i].getTitle() === id) {
          this.marcadores[i].setMap(null);
          break;
        }
      }
    });
  }

  cargarMapa() {
    const latLng = new google.maps.LatLng(37.784679, -122.395936);
    const mapaOpciones: google.maps.MapOptions = {
      center: latLng,
      zoom: 13,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
    };

    this.map = new google.maps.Map(
      this.mapaElement.nativeElement,
      mapaOpciones
    );

    this.map.addListener('click', (coors) => {
      const nuevoMarcador = {
        nombre: 'Nuevo lugar',
        lat: coors.latLng.lat(),
        lng: coors.latLng.lng(),
        id: new Date().toISOString(),
      };
      this.agregarMarcador(nuevoMarcador);
      // Emitir evento de socket, agregar marcador
      this.wsService.emit('agregar-marcador', nuevoMarcador);
    });

    for (const marcador of this.lugares) {
      this.agregarMarcador(marcador);
    }
  }

  agregarMarcador(marcador: Lugar) {
    const latLng = new google.maps.LatLng(marcador.lat, marcador.lng);
    const marker = new google.maps.Marker({
      map: this.map,
      animation: google.maps.Animation.DROP,
      position: latLng,
      draggable: true,
      title: marcador.id,
    });
    this.marcadores.push(marker);

    const contenido = `<b> ${marcador.nombre} </b>`;
    const infoWindow = new google.maps.InfoWindow({
      content: contenido,
    });
    this.infoWindows.push(infoWindow);
    google.maps.event.addDomListener(marker, 'click', () => {
      this.infoWindows.forEach((infoW) => infoW.close());
      infoWindow.open(this.map, marker);
    });

    google.maps.event.addDomListener(marker, 'dblclick', (coors) => {
      marker.setMap(null);
      // Disparar un evento de sockets para borrar marcador
      this.wsService.emit('marcador-borrar', marcador.id);
    });

    google.maps.event.addDomListener(marker, 'drag', (coors: any) => {
      const nuevoMarcador = {
        lat: coors.latLng.lat(),
        lng: coors.latLng.lng(),
        nombre: marcador.nombre,
        id: marcador.id,
      };
      console.log(nuevoMarcador);

      // TODO: Disparar un evento de sockets para mover marcador
      this.wsService.emit('marcador-mover', nuevoMarcador);
    });
  }
}
