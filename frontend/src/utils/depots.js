export const PROVINCES = [
  {
    name: 'Western Province',
    depots: [
      'Colombo Central', 'Ratmalana', 'Moratuwa', 'Panadura',
      'Avissawella', 'Homagama', 'Kesbewa', 'Negombo', 'Gampaha', 'Nittambuwa',
    ],
  },
  {
    name: 'Central Province',
    depots: ['Kandy Central', 'Uda Eriyagama', 'Matale', 'Dambulla', 'Nuwara Eliya', 'Hatton'],
  },
  {
    name: 'Southern Province',
    depots: ['Galle', 'Matara', 'Tangalle', 'Ambalantota', 'Hakmana'],
  },
  {
    name: 'Northern Province',
    depots: ['Jaffna', 'Kilinochchi', 'Mullaitivu', 'Vavuniya'],
  },
  {
    name: 'Eastern Province',
    depots: ['Batticaloa', 'Kalmunai', 'Ampara', 'Trincomalee'],
  },
  {
    name: 'North Western Province',
    depots: ['Kurunegala', 'Kuliyapitiya', 'Chilaw', 'Puttalam'],
  },
  {
    name: 'North Central Province',
    depots: ['Anuradhapura', 'Polonnaruwa'],
  },
  {
    name: 'Uva Province',
    depots: ['Badulla', 'Bandarawela', 'Monaragala'],
  },
  {
    name: 'Sabaragamuwa Province',
    depots: ['Ratnapura', 'Balangoda', 'Kegalle'],
  },
];

export const ALL_DEPOTS = PROVINCES.flatMap((p) => p.depots);
