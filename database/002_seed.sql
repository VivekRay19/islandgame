-- Seed: Season 1 + Story Events
INSERT INTO seasons (season_number, name, starts_at, is_active)
VALUES (1, 'The First Monsoon', NOW(), true)
ON CONFLICT (season_number) DO NOTHING;

-- World regions (5x5 grid A1..E5)
DO $$ 
DECLARE r TEXT; c TEXT;
BEGIN
  FOREACH r IN ARRAY ARRAY['A','B','C','D','E'] LOOP
    FOREACH c IN ARRAY ARRAY['1','2','3','4','5'] LOOP
      INSERT INTO world_regions (region_code, region_type, health)
      VALUES (r||c,
        CASE (RANDOM()*4)::INT
          WHEN 0 THEN 'forest'
          WHEN 1 THEN 'farming'
          WHEN 2 THEN 'coastal'
          ELSE 'mountain' END,
        80 + (RANDOM()*20)::INT)
      ON CONFLICT (region_code) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- Story events (deep campaign)
INSERT INTO story_events (event_key, act, trigger_session, title, narrative, choices, is_branching)
VALUES
('act1_founding',1,1,
 'The Island Awakens',
 'You stand on virgin soil. The elder council asks: what will your civilisation be known for?',
 '[{"key":"trade","text":"A centre of fair trade and commerce","consequence":{"harmony":10,"trade_bonus":true}},{"key":"craft","text":"A haven of artisan craftsmanship","consequence":{"harmony":8,"craft_bonus":true}},{"key":"nature","text":"A keeper of the sacred forests","consequence":{"harmony":12,"forest_bonus":true}}]',
 true),
('act1_first_harvest',1,2,
 'The First Harvest',
 'Rain has blessed the terraces. Your granaries overflow. The western islands ask for grain.',
 '[{"key":"share","text":"Share the surplus freely","consequence":{"harmony":15,"grain":-2}},{"key":"trade","text":"Trade it for stone and timber","consequence":{"stone":2,"wood":2}},{"key":"hoard","text":"Keep it all for hard times","consequence":{"grain":3,"harmony":-5}}]',
 true),
('act2_the_drought',2,4,
 'The Long Dry Season',
 'Three moons without rain. Your farms wither. The river slows to a trickle.',
 '[{"key":"dig_wells","text":"Spend 3 stone to dig deep wells","consequence":{"stone":-3,"water":4,"harmony":5}},{"key":"trade_water","text":"Trade fibre for water from Kabir","consequence":{"fibre":-2,"water":3}},{"key":"migrate","text":"Send families to the coastal region","consequence":{"harmony":-8,"food_loss":true}}]',
 true),
('act2_traders_guild',2,5,
 'The Traders Guild Arrives',
 'A powerful guild offers to build a Grand Haat on your island — but demands half your wood reserves.',
 '[{"key":"accept","text":"Accept and build the Grand Haat","consequence":{"wood":-4,"score":20,"grand_haat":true}},{"key":"negotiate","text":"Negotiate: offer clay instead","consequence":{"clay":-3,"score":12}},{"key":"refuse","text":"Refuse and build your own market","consequence":{"harmony":10,"independence":true}}]',
 true),
('act3_the_storm',3,8,
 'The Great Storm',
 'A cyclone tears through the islands. Three of your tiles are damaged. Your neighbours are in crisis.',
 '[{"key":"rebuild","text":"Focus on rebuilding your own island","consequence":{"stone":-2,"wood":-2,"harmony":-5}},{"key":"help_neighbours","text":"Send aid to neighbouring islands first","consequence":{"harmony":20,"legacy":15,"resources_lost":true}},{"key":"fortify","text":"Use remaining stone to fortify against future storms","consequence":{"stone":-3,"resilience":true}}]',
 true),
('act4_the_legacy',4,15,
 'The Council of Elders',
 'After generations of toil, the elder council gathers. How will your civilisation be remembered?',
 '[{"key":"harmony","text":"A civilisation of cultural harmony and music","consequence":{"harmony":30,"legacy":50}},{"key":"industry","text":"An industrial powerhouse of craft and trade","consequence":{"score":40,"legacy":30}},{"key":"nature","text":"Guardians of the sacred forests and rivers","consequence":{"harmony":25,"legacy":40,"ecological_bonus":true}}]',
 true)
ON CONFLICT (event_key) DO NOTHING;
