
-- Create scripts table
CREATE TABLE IF NOT EXISTS public.scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  long_description text DEFAULT '',
  game text NOT NULL,
  category text NOT NULL,
  tags text[] DEFAULT '{}',
  trending boolean DEFAULT false,
  verified boolean DEFAULT false,
  code text NOT NULL,
  faqs jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Anyone can read scripts"
ON public.scripts FOR SELECT
TO anon, authenticated
USING (true);

-- Create storage bucket for game thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES ('game-thumbnails', 'game-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read thumbnails
CREATE POLICY "Public read access for game thumbnails"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'game-thumbnails');

-- Allow service role to upload
CREATE POLICY "Service role can upload game thumbnails"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'game-thumbnails');

-- Seed scripts data
INSERT INTO public.scripts (slug, title, description, long_description, game, category, tags, trending, verified, code, faqs) VALUES
('blox-fruits-auto-farm-v3', 'Blox Fruits Auto Farm V3', 'The most powerful Blox Fruits auto farm script. Auto quest, auto boss, auto fruit sniper, and sea events all in one hub.', 'COMBO_WICK presents the ultimate Blox Fruits Auto Farm script. This script automates grinding, quest completion, boss farming, and Devil Fruit sniping. It includes an anti-AFK module and a clean GUI that lets you toggle each feature individually.', 'Blox Fruits', 'Auto Farm', ARRAY['auto-farm', 'blox-fruits', 'gui', 'fruit-sniper', 'boss-farm'], true, true, E'-- COMBO_WICK | Blox Fruits Auto Farm V3\n-- Verified & Updated: March 2025\n\nlocal Players = game:GetService("Players")\nlocal RunService = game:GetService("RunService")\nlocal lp = Players.LocalPlayer\n\nlocal gui = loadstring(game:HttpGet(\n  "https://raw.githubusercontent.com/combowick/blox-fruits-v3/main/gui.lua"\n))()\n\nlocal config = {\n  autoQuest = true,\n  autoBoss = true,\n  fruitSniper = true,\n  antiAfk = true,\n  teleportToMobs = true,\n}\n\ngui.init(config)\nprint("[COMBO_WICK] Blox Fruits Auto Farm V3 Loaded")', '[{"question":"What does this Blox Fruits script do?","answer":"This script automates quest completion, boss farming, and Devil Fruit sniping in Blox Fruits."},{"question":"Which executors does this script work with?","answer":"Compatible with Synapse X, Script-Ware, KRNL, Fluxus, and most other level 7 executors."}]'::jsonb),

('arsenal-aimbot-silent', 'Arsenal Silent Aimbot', 'Undetected silent aimbot for Arsenal with FOV circle, smoothness control, and hitbox expander.', 'Dominate every Arsenal match with this precision silent aimbot. Features include adjustable FOV, aim smoothness, bone priority selection, and a built-in hitbox expander.', 'Arsenal', 'Aimbot', ARRAY['aimbot', 'arsenal', 'silent-aim', 'hitbox', 'fov'], true, true, E'-- COMBO_WICK | Arsenal Silent Aimbot\n-- Updated: March 2025\n\nlocal AimbotSettings = {\n  Enabled = true,\n  SilentAim = true,\n  FOV = 120,\n  Smoothness = 0.15,\n  Bone = "HumanoidRootPart",\n}', '[{"question":"What does Arsenal Silent Aimbot do?","answer":"It fires bullets directly at enemies without visually locking your camera."}]'::jsonb),

('murder-mystery-2-esp', 'Murder Mystery 2 ESP', 'Full ESP for Murder Mystery 2 showing murderer, sheriff, player positions, and knife locations through walls.', 'Get a massive advantage in Murder Mystery 2 with this comprehensive ESP script. Highlights the Murderer in red, Sheriff in blue, innocents in white.', 'Murder Mystery 2', 'ESP', ARRAY['esp', 'murder-mystery-2', 'wallhack', 'murderer-esp', 'chams'], true, true, E'-- COMBO_WICK | Murder Mystery 2 ESP\n\nlocal ESP = {}\n\nlocal function createHighlight(character, color)\n  local highlight = Instance.new("Highlight")\n  highlight.FillColor = color\n  highlight.Parent = character\n  return highlight\nend\n\nprint("[COMBO_WICK] MM2 ESP Active")', '[{"question":"What does Murder Mystery 2 ESP show?","answer":"It highlights the Murderer (red), Sheriff (blue), innocents (white), and dropped items through walls."}]'::jsonb),

('adopt-me-auto-farm-pets', 'Adopt Me Pet Auto Farm', 'Auto-farm bucks, complete tasks, hatch eggs, and age pets automatically in Adopt Me.', 'Maximize your Adopt Me progression with this feature-rich automation script.', 'Adopt Me', 'Auto Farm', ARRAY['adopt-me', 'auto-farm', 'pet-farm', 'bucks', 'egg-hatch'], false, true, E'-- COMBO_WICK | Adopt Me Auto Farm\nlocal config = {\n  AutoBucks = true,\n  AutoTasks = true,\n  AutoAgePets = true,\n}', '[]'::jsonb),

('brookhaven-admin-god-mode', 'Brookhaven God Mode + Admin', 'Full admin panel for Brookhaven with god mode, speed, fly, teleport, and NPC control.', 'Turn Brookhaven into your personal playground with this comprehensive admin script.', 'Brookhaven', 'Admin', ARRAY['brookhaven', 'admin', 'god-mode', 'fly', 'noclip'], false, false, E'-- COMBO_WICK | Brookhaven Admin Panel\nlocal Humanoid = Character:WaitForChild("Humanoid")\nHumanoid.MaxHealth = math.huge\nHumanoid.Health = math.huge\nprint("[COMBO_WICK] Admin Panel Loaded")', '[]'::jsonb),

('da-hood-speed-aimbot', 'Da Hood Speed + Aimbot Combo', 'Combined speed hack and aimbot for Da Hood. Reach targets instantly and eliminate them with precision.', 'The ultimate Da Hood combo script.', 'Da Hood', 'Speed Hack', ARRAY['da-hood', 'speed', 'aimbot', 'combo'], true, true, E'-- COMBO_WICK | Da Hood Speed + Aimbot\nlocal settings = {\n  Speed = 200,\n  AimbotEnabled = true,\n}', '[]'::jsonb),

('pet-simulator-x-auto-farm', 'Pet Simulator X Auto Farm', 'Auto-farm coins, diamonds, and hatch eggs in Pet Simulator X. Includes auto-enchant and best egg selection.', 'The most complete Pet Simulator X farming script available.', 'Pet Simulator X', 'Auto Farm', ARRAY['pet-sim-x', 'auto-farm', 'coins', 'diamonds'], false, true, E'-- COMBO_WICK | Pet Sim X Auto Farm\nprint("[COMBO_WICK] PSX Auto Farm Active")', '[]'::jsonb),

('universal-infinite-jump', 'Universal Infinite Jump', 'Works in any Roblox game. Infinite jump with adjustable height and toggle keybind.', 'A universal script that enables infinite jumping in any Roblox game.', 'Universal', 'Infinite Jump', ARRAY['universal', 'infinite-jump', 'any-game'], false, true, E'-- COMBO_WICK | Universal Infinite Jump\nlocal UIS = game:GetService("UserInputService")\nprint("[COMBO_WICK] Infinite Jump Active")', '[]'::jsonb),

('universal-esp-all-games', 'Universal ESP (All Games)', 'ESP that works in every Roblox game. See all players through walls with distance, health, and name tags.', 'A universal ESP script compatible with all Roblox games.', 'Universal', 'ESP', ARRAY['universal', 'esp', 'wallhack', 'all-games'], true, true, E'-- COMBO_WICK | Universal ESP\nprint("[COMBO_WICK] Universal ESP Active")', '[]'::jsonb),

('blox-fruits-kill-aura', 'Blox Fruits Kill Aura', 'Automatic kill aura for Blox Fruits. Damages all nearby enemies without manual input.', 'Effortlessly eliminate enemies in Blox Fruits with this kill aura script.', 'Blox Fruits', 'Kill Aura', ARRAY['blox-fruits', 'kill-aura', 'auto-kill'], false, true, E'-- COMBO_WICK | Blox Fruits Kill Aura\nprint("[COMBO_WICK] Kill Aura Active")', '[]'::jsonb);
