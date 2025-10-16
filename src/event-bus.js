/**
 * event-bus.js
 * Un sistema simple de publicación/suscripción (Pub/Sub) para la comunicación
 * entre módulos desacoplados.
 */

const events = new Map();

/**
 * Publica un evento a todos sus suscriptores.
 * @param {string} eventName - El nombre del evento.
 * @param {*} data - Los datos que se pasarán a los suscriptores.
 */
function publish(eventName, data) {
  if (events.has(eventName)) {
    events.get(eventName).forEach(callback => callback(data));
  }
}

/**
 * Se suscribe a un evento para recibir notificaciones.
 * @param {string} eventName - El nombre del evento.
 * @param {Function} callback - La función que se ejecutará cuando se publique el evento.
 * @returns {object} - Un objeto con una función `unsubscribe`.
 */
function subscribe(eventName, callback) {
  if (!events.has(eventName)) {
    events.set(eventName, []);
  }
  
  const subscribers = events.get(eventName);
  subscribers.push(callback);

  return {
    unsubscribe() {
      const index = subscribers.indexOf(callback);
      if (index > -1) {
        subscribers.splice(index, 1);
      }
    }
  };
}

export const eventBus = {
  publish,
  subscribe
};