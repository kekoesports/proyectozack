/**
 * Preload del worker: neutraliza `server-only`.
 *
 * El worker importa las mismas queries que usa Next, y todas llevan
 * `import 'server-only'`. Ese paquete lanza en cuanto se carga fuera de un
 * entorno con la condición de exportación `react-server` — es decir, en
 * cualquier proceso de Node corriente. Sin esto, el worker muere al arrancar
 * con un error que habla de Client Components y no dice nada del problema.
 *
 * ¿Por qué no `--conditions=react-server`? Porque esa condición cambia la
 * resolución de React entera y rompe cualquier módulo de la cadena que lo
 * importe (`createContext is not a function`). Es una condición pensada para el
 * bundler de Next, no para un proceso suelto.
 *
 * ¿Por qué no quitar `server-only` de las queries? Porque ahí hace su trabajo:
 * impedir que ese código acabe en el bundle del navegador. Quitarlo para que
 * arranque el worker abriría un agujero real para arreglar un problema de
 * entorno.
 *
 * El worker **es** un entorno de servidor. Esto solo se lo dice a Node.
 */

const Module = require('node:module');

const cargaOriginal = Module._load;

Module._load = function (peticion, ...resto) {
  if (peticion === 'server-only') return {};
  return cargaOriginal.call(this, peticion, ...resto);
};
